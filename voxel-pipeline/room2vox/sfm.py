"""Stage 2: camera poses + sparse points via COLMAP (pycolmap, CPU is fine, works on Mac and Linux)."""
from dataclasses import dataclass
from pathlib import Path

import numpy as np


@dataclass
class Frame:
    path: Path
    K: np.ndarray        # 3x3
    dist: np.ndarray     # OpenCV distortion coeffs
    R: np.ndarray        # world->cam rotation
    t: np.ndarray        # world->cam translation
    kp_xy: np.ndarray    # (M,2) pixel coords of triangulated keypoints
    kp_xyz: np.ndarray   # (M,3) their world positions
    size: tuple          # (w, h)


def run_sfm(images_dir: Path, work: Path) -> tuple[list[Frame], np.ndarray]:
    import pycolmap

    db = work / "colmap.db"
    sparse = work / "sparse"
    if db.exists():
        db.unlink()
    sparse.mkdir(parents=True, exist_ok=True)

    pycolmap.extract_features(db, images_dir, camera_mode=pycolmap.CameraMode.SINGLE,
                              camera_model="SIMPLE_RADIAL")
    pycolmap.match_exhaustive(db)
    maps = pycolmap.incremental_mapping(db, images_dir, sparse)
    if not maps:
        raise RuntimeError("COLMAP could not reconstruct the scene (move slower / more texture / more overlap)")
    rec = max(maps.values(), key=lambda r: r.num_reg_images())
    print(f"[sfm] registered {rec.num_reg_images()} images, {len(rec.points3D)} points")

    frames = []
    for img in rec.images.values():
        cam = rec.cameras[img.camera_id]
        cfw = img.cam_from_world
        cfw = cfw() if callable(cfw) else cfw
        M = np.asarray(cfw.matrix())
        K = np.asarray(cam.calibration_matrix())
        k1 = float(cam.params[3]) if len(cam.params) > 3 else 0.0
        xy, xyz = [], []
        for p in img.points2D:
            if p.has_point3D():
                xy.append(p.xy)
                xyz.append(rec.points3D[p.point3D_id].xyz)
        frames.append(Frame(images_dir / img.name, K, np.array([k1, 0, 0, 0.0]), M[:, :3], M[:, 3],
                            np.array(xy).reshape(-1, 2), np.array(xyz).reshape(-1, 3),
                            (cam.width, cam.height)))
    frames.sort(key=lambda f: f.path.name)
    pts = np.array([p.xyz for p in rec.points3D.values()])
    return frames, pts
