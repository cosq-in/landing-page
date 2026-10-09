"""Stage 5b: fit the room's box (floor, ceiling, four walls) and rebuild a clean shell.

A handheld scan gives noisy, holey surfaces. Rooms are boxes, so we find the strongest floor/ceiling
heights and the strongest wall planes along each axis, build the shell from those, and keep the
scanned voxels inside it as furniture."""
import numpy as np
import open3d as o3d

from .voxel import _lab, DEFAULT_PALETTE, voxelize


def _peaks(vals, lo_frac=0.25, bin_m=0.05):
    """Lowest and highest strong peak of a 1-D histogram (strong = >= lo_frac of the biggest bin)."""
    lo, hi = np.percentile(vals, [1, 99])
    bins = np.arange(lo, hi + bin_m, bin_m)
    h, e = np.histogram(vals, bins)
    h = np.convolve(h, np.ones(3) / 3, "same")
    strong = np.flatnonzero(h >= lo_frac * h.max())
    c = (e[:-1] + e[1:]) / 2
    return float(c[strong[0]]), float(c[strong[-1]])


def fit_box(xyz, ceiling_height=2.5):
    """Return (x0, x1, y0, y1, z0, z1) of the room in the aligned frame (Y up, axis-aligned walls)."""
    sub = xyz[np.random.default_rng(0).choice(len(xyz), min(len(xyz), 150000), replace=False)]
    pc = o3d.geometry.PointCloud(o3d.utility.Vector3dVector(sub)).voxel_down_sample(0.03)
    pc.estimate_normals(o3d.geometry.KDTreeSearchParamHybrid(radius=0.12, max_nn=30))
    p, n = np.asarray(pc.points), np.abs(np.asarray(pc.normals))
    horiz = n[:, 1] > 0.85                     # floors, ceilings, table tops, beds
    nx, nz = (n[:, 0] > 0.85), (n[:, 2] > 0.85)  # walls facing along x / z
    y0, y1 = _peaks(p[horiz, 1]) if horiz.sum() > 100 else (p[:, 1].min(), p[:, 1].max())
    x0, x1 = _peaks(p[nx, 0]) if nx.sum() > 100 else (p[:, 0].min(), p[:, 0].max())
    z0, z1 = _peaks(p[nz, 2]) if nz.sum() > 100 else (p[:, 2].min(), p[:, 2].max())
    if y1 - y0 < 0.9 * ceiling_height:      # ceiling barely scanned: trust the height the scale was set from
        print(f"[shell] ceiling not seen (found {y1 - y0:.2f} m); using {ceiling_height} m")
        y1 = y0 + ceiling_height
    box = np.array([x0, x1, y0, y1, z0, z1])
    print(f"[shell] box x {x0:.2f}..{x1:.2f}  y {y0:.2f}..{y1:.2f}  z {z0:.2f}..{z1:.2f}  "
          f"({x1 - x0:.2f} x {z1 - z0:.2f} m, height {y1 - y0:.2f} m)")
    return box


def _snap(rgb255, palette):
    d = ((_lab(rgb255)[:, None, :] - _lab(palette)[None]) ** 2).sum(-1)
    return d.argmin(1)


def build_room(xyz, rgb01, box, voxel_size=0.10, palette=None, max_object_h=1.6):
    """Scan voxels clipped to the box, plus a solid one-voxel shell coloured from nearby scan points."""
    pal = DEFAULT_PALETTE if palette is None else np.asarray(palette, np.float64)
    vs = voxel_size
    x0, x1, y0, y1, z0, z1 = box
    dims = np.maximum(np.ceil((box[1::2] - box[0::2]) / vs).astype(int), 4)
    org = np.array([x0, y0, z0])
    grid = np.zeros(dims, np.int32)

    # furniture: scan voxels strictly inside the shell
    lo_m, hi_m = org + np.array([2, 1, 2]) * vs, org + (dims - np.array([2, 2, 2])) * vs   # skip the wall-surface layer
    hi_m[1] = min(hi_m[1], y0 + max_object_h)       # furniture is low; anything higher is mid-air depth noise
    inside = ((xyz > lo_m) & (xyz < hi_m)).all(1)
    if inside.sum() > 50:
        g, p2, o2 = voxelize(xyz[inside], rgb01[inside], vs, min_points=10, min_component=60, palette=pal, margin=0)
        off = np.round((o2 - org) / vs).astype(int)
        sl = tuple(slice(max(o, 0), min(o + s, d)) for o, s, d in zip(off, g.shape, dims))
        gs = tuple(slice(max(-o, 0), max(-o, 0) + (s.stop - s.start)) for o, s in zip(off, sl))
        grid[sl] = g[gs]

    # shell: each face takes the median colour of scan points lying on/near that plane
    faces = {"x-": (0, 0), "x+": (0, dims[0] - 1), "y-": (1, 0), "y+": (1, dims[1] - 1),
             "z-": (2, 0), "z+": (2, dims[2] - 1)}
    for name, (ax, layer) in faces.items():
        plane = org[ax] + (layer + (0.5 if layer == 0 else 0.5)) * vs
        near = np.abs(xyz[:, ax] - plane) < 1.2 * vs
        med = np.median(rgb01[near], axis=0) * 255 if near.sum() > 30 else np.array([0xF5, 0xEE, 0xDC])
        idx = tuple(np.s_[:] if a != ax else layer for a in range(3))
        face_idx = int(_snap(med[None], pal)[0]) + 1
        sub = grid[idx]
        sub[sub == 0] = face_idx
        grid[idx] = sub
    print(f"[shell] grid {tuple(dims)}  blocks {int((grid > 0).sum())}")
    return grid, pal, org
