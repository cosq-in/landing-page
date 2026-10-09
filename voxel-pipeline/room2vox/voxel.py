"""Stage 5: points -> clean, palette-quantised voxel grid."""
import numpy as np
from scipy import ndimage as ndi

# Minecraft-ish block colours (RGB 0-255). Index 0 in the grid is reserved for air.
DEFAULT_PALETTE = np.array([
    (233, 236, 236), (240, 118, 19), (189, 68, 179), (58, 175, 217), (248, 197, 39), (112, 185, 25),
    (237, 141, 172), (62, 68, 71), (142, 142, 134), (21, 137, 145), (137, 50, 184), (53, 57, 157),
    (114, 71, 40), (84, 109, 27), (161, 39, 34), (20, 21, 25),                      # wool/concrete
    (125, 125, 125), (189, 189, 189), (157, 128, 79), (181, 142, 87), (219, 211, 160),  # stone, planks, sand
    (104, 78, 47), (73, 47, 29), (226, 220, 200), (167, 167, 156), (110, 86, 60),
], dtype=np.float64)


def _lab(rgb255):
    c = np.asarray(rgb255, np.float64) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = (c @ M.T) / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def scene_palette(rgb255, k=24, seed=0):
    from scipy.cluster.vq import kmeans2
    lab = _lab(rgb255)
    sub = lab[np.random.default_rng(seed).choice(len(lab), min(len(lab), 20000), replace=False)]
    cent, _ = kmeans2(sub, k, minit="++", seed=seed)
    # back to RGB via nearest actual colour in the data (avoids writing Lab->RGB)
    idx = [np.argmin(((lab - c) ** 2).sum(1)) for c in cent]
    return np.unique(rgb255[idx], axis=0)


def voxelize(xyz, rgb01, voxel_size=0.10, min_points=3, close=True, min_component=40,
             palette=None, margin=1):
    """Return (grid[int, 0=air], palette RGB array, origin)."""
    palette = DEFAULT_PALETTE if palette is None else np.asarray(palette, np.float64)
    origin = xyz.min(0) - margin * voxel_size
    ijk = np.floor((xyz - origin) / voxel_size).astype(np.int64)
    dims = ijk.max(0) + 1 + margin
    flat = np.ravel_multi_index(ijk.T, dims)
    uniq, inv, cnt = np.unique(flat, return_inverse=True, return_counts=True)
    col = np.stack([np.bincount(inv, rgb01[:, c] * 255.0) / cnt for c in range(3)], 1)

    occ = np.zeros(dims, bool)
    color = np.zeros(tuple(dims) + (3,))
    keep = cnt >= min_points
    pos = np.unravel_index(uniq[keep], dims)
    occ[pos], color[pos] = True, col[keep]
    print(f"[voxel] grid {tuple(dims)}  occupied {occ.sum()}")

    if close:
        occ = ndi.binary_closing(occ, structure=np.ones((3, 3, 3)), iterations=1)
    lab, n = ndi.label(occ, structure=np.ones((3, 3, 3)))
    if n:
        sizes = ndi.sum(occ, lab, range(1, n + 1))
        occ &= np.isin(lab, 1 + np.flatnonzero(sizes >= min_component))

    # colour for voxels added by closing: copy from nearest coloured voxel
    has_col = color.any(-1) & occ
    if (occ & ~has_col).any():
        _, (ix, iy, iz) = ndi.distance_transform_edt(~has_col, return_indices=True)
        color = color[ix, iy, iz]

    # nearest palette entry in Lab
    plab = _lab(palette)
    vox = np.argwhere(occ)
    vlab = _lab(color[occ])
    idx = np.argmin(((vlab[:, None, :] - plab[None]) ** 2).sum(-1), 1)
    grid = np.zeros(dims, np.int32)
    grid[tuple(vox.T)] = idx + 1
    print(f"[voxel] final blocks {len(vox)}, palette used {len(np.unique(idx))}/{len(palette)}")
    return grid, palette, origin
