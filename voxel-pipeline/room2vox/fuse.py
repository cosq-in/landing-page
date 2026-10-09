"""Stage 4: gravity/floor alignment + metric scale, then TSDF fusion into a coloured point cloud."""
from pathlib import Path

import cv2
import numpy as np

from .depth import DepthEstimator, metric_depth


def _rot_a_to_b(a, b):
    a, b = a / np.linalg.norm(a), b / np.linalg.norm(b)
    v, c = np.cross(a, b), float(a @ b)
    if c < -0.999999:
        return np.diag([1.0, -1.0, -1.0])
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx / (1 + c)


def _ransac_plane(pts, thr, iters=800, seed=0):
    rng = np.random.default_rng(seed)
    best, best_n = None, 0
    for _ in range(iters):
        s = pts[rng.choice(len(pts), 3, replace=False)]
        n = np.cross(s[1] - s[0], s[2] - s[0])
        if np.linalg.norm(n) < 1e-12:
            continue
        n /= np.linalg.norm(n)
        inl = np.abs((pts - s[0]) @ n) < thr
        if inl.sum() > best_n:
            best, best_n = (n, float(n @ s[0]), inl), inl.sum()
    return best


def _refine_up(pts, up, iters=4):
    """Snap the camera-derived up vector onto the true vertical using surface normals:
    floors and ceilings are the biggest near-horizontal surfaces in a room."""
    import open3d as o3d
    sub = pts[np.random.default_rng(0).choice(len(pts), min(len(pts), 60000), replace=False)]
    pc = o3d.geometry.PointCloud(o3d.utility.Vector3dVector(sub))
    ext = np.linalg.norm(sub.max(0) - sub.min(0))
    pc = pc.voxel_down_sample(ext / 150)
    pc.estimate_normals(o3d.geometry.KDTreeSearchParamHybrid(radius=ext / 40, max_nn=30))
    nrm = np.asarray(pc.normals)
    for _ in range(iters):
        d = nrm @ up
        sel = np.abs(d) > np.cos(np.radians(35))
        if sel.sum() < 50:
            break
        v = nrm[sel] * np.sign(d[sel])[:, None]
        # principal direction of the near-vertical normals
        w, V = np.linalg.eigh(v.T @ v)
        cand = V[:, -1] * np.sign(V[:, -1] @ up)
        up = cand / np.linalg.norm(cand)
    print(f"[align] refined up from normals ({int(sel.sum())} floor/ceiling normals)")
    return up


def estimate_alignment(frames, pts, ceiling_height=2.5, scale=None):
    """Return (R, s, floor_d): x' = s * (R x - floor_d * Y). Y is up, floor at y=0, metres."""
    # phones are held upright: camera -y axis ~ world up
    ups = np.array([-f.R.T[:, 1] for f in frames])
    up = ups.mean(0)
    up /= np.linalg.norm(up)
    up = _refine_up(pts, up)

    h = pts @ up
    lo, hi = np.percentile(h, [2, 98])
    thr = 0.02 * (hi - lo)
    low = pts[h < np.percentile(h, 35)]
    floor_d = lo
    n = up
    if len(low) > 50:
        res = _ransac_plane(low, thr)
        if res is not None:
            pn, pd, _ = res
            if pn @ up < 0:
                pn, pd = -pn, -pd
            if np.degrees(np.arccos(np.clip(pn @ up, -1, 1))) < 30:
                n, floor_d = pn, pd
            else:
                print("[align] floor plane not close to camera-up, falling back to camera-up")
    R = _rot_a_to_b(n, np.array([0.0, 1.0, 0.0]))
    top = np.percentile(pts @ n, 98)
    s = scale if scale else ceiling_height / max(top - floor_d, 1e-9)
    print(f"[align] scale={s:.4f}  (assuming scene height {ceiling_height} m; override with --scale)")
    return R, s, floor_d


def cloud_from_depth(frames, R, s, floor_d, stride=2):
    """VGGT path: unproject each frame's dense depth straight into a coloured world cloud (metres, Y up).
    No TSDF here: with only ~24 sparse views, TSDF voxels rarely reach the minimum-weight cutoff."""
    b = -s * floor_d * np.array([0.0, 1.0, 0.0])
    xyz, col = [], []
    for f in frames:
        H, W = f.depth.shape
        ys, xs = np.mgrid[0:H:stride, 0:W:stride]
        d = f.depth[ys, xs]
        m = d > 0
        cam = np.stack([(xs[m] - f.K[0, 2]) / f.K[0, 0] * d[m], (ys[m] - f.K[1, 2]) / f.K[1, 1] * d[m], d[m]], 1)
        world = (cam - f.t) @ f.R                       # R^T (cam - t)
        xyz.append(s * (world @ R.T) + b)
        col.append(f.rgb[ys, xs][m] / 255.0)
    return np.concatenate(xyz), np.concatenate(col)


def fuse(frames, pts, R, s, floor_d, estimator, voxel_length=0.03, max_depth=8.0):
    import open3d as o3d

    if all(f.depth is not None for f in frames):
        xyz, rgb = cloud_from_depth(frames, R, s, floor_d)
        print(f"[fuse] {len(xyz)} points from {len(frames)} dense depth maps")
        return snap_yaw(xyz), rgb
    b = -s * floor_d * np.array([0.0, 1.0, 0.0])
    vol = o3d.pipelines.integration.ScalableTSDFVolume(
        voxel_length=voxel_length, sdf_trunc=voxel_length * 4,
        color_type=o3d.pipelines.integration.TSDFVolumeColorType.RGB8)

    used = 0
    for i, f in enumerate(frames):
        if f.depth is not None:                    # VGGT path: depth already dense, no undistortion
            rgb, z = f.rgb, f.depth.copy()
        else:
            bgr = cv2.undistort(cv2.imread(str(f.path)), f.K, f.dist)
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            # sparse z in camera frame (COLMAP units), measured on the *distorted* keypoints -> small mismatch, fine
            z_kp = (f.kp_xyz @ f.R.T + f.t)[:, 2]
            z = metric_depth(estimator.disparity(rgb), f.kp_xy, z_kp)
            if z is None:
                print(f"[fuse] {i + 1}/{len(frames)} skipped (too few sparse points)")
                continue
        z = (z * s).astype(np.float32)
        z[z > max_depth] = 0
        Rc = f.R @ R.T
        tc = s * f.t - Rc @ b
        ext = np.eye(4)
        ext[:3, :3], ext[:3, 3] = Rc, tc
        h, w = z.shape
        intr = o3d.camera.PinholeCameraIntrinsic(w, h, f.K[0, 0], f.K[1, 1], f.K[0, 2], f.K[1, 2])
        rgbd = o3d.geometry.RGBDImage.create_from_color_and_depth(
            o3d.geometry.Image(np.ascontiguousarray(rgb)), o3d.geometry.Image(np.ascontiguousarray(z)),
            depth_scale=1.0, depth_trunc=max_depth, convert_rgb_to_intensity=False)
        vol.integrate(rgbd, intr, ext)
        used += 1
        if (i + 1) % 20 == 0:
            print(f"[fuse] {i + 1}/{len(frames)}")
    print(f"[fuse] integrated {used} frames")
    pcd = vol.extract_point_cloud()
    xyz, rgb = np.asarray(pcd.points), np.asarray(pcd.colors)
    return snap_yaw(xyz), rgb  # rgb in 0..1


def snap_yaw(xyz):
    """Rotate about Y so dominant wall direction is axis-aligned (Manhattan-world)."""
    import open3d as o3d
    p = o3d.geometry.PointCloud(o3d.utility.Vector3dVector(xyz)).voxel_down_sample(0.05)
    p.estimate_normals(o3d.geometry.KDTreeSearchParamHybrid(radius=0.15, max_nn=30))
    nrm = np.asarray(p.normals)
    wall = np.abs(nrm[:, 1]) < 0.3
    if wall.sum() < 100:
        return xyz
    ang = np.arctan2(nrm[wall, 2], nrm[wall, 0])
    yaw = np.arctan2(np.sin(4 * ang).mean(), np.cos(4 * ang).mean()) / 4
    c, s_ = np.cos(-yaw), np.sin(-yaw)
    Ry = np.array([[c, 0, s_], [0, 1, 0], [-s_, 0, c]])
    print(f"[align] yaw snap {np.degrees(yaw):.1f} deg")
    return xyz @ Ry.T
