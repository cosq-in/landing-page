"""Stage 5: points -> clean, palette-quantised voxel grid."""
import numpy as np
from scipy import ndimage as ndi

# Kurukuru map palette (kurukuru-fe lib/theme/colors.dart + map/voxel_map_view.dart tones).
# Index 0 in the grid is reserved for air.
DEFAULT_PALETTE = np.array([
    (0xF5, 0xEE, 0xDC), (0xFF, 0xFC, 0xF2), (0xEA, 0xDF, 0xC6), (0xDA, 0xD3, 0xC4), (0xCA, 0xD4, 0xE0),  # parchment, field, walls
    (0xE6, 0xDF, 0xC9), (0xCF, 0xC7, 0xAB), (0xE6, 0xD4, 0x9A), (0xD6, 0xB8, 0x87), (0xB9, 0xA0, 0x7A),  # sand, planks
    (0xA0, 0x70, 0x3F), (0x8A, 0x5A, 0x35), (0x6B, 0x44, 0x23),                                          # wood, dirt
    (0xB8, 0xB6, 0xAC), (0x8E, 0x8C, 0x82), (0x9A, 0x94, 0x88), (0x7C, 0x7A, 0x78), (0x66, 0x65, 0x6A),  # stone, road
    (0x7D, 0xBB, 0x4A), (0x6D, 0xB0, 0x4A), (0x5E, 0x9A, 0x3B), (0x4E, 0x8A, 0x2B), (0xB8, 0xC9, 0x6A),  # grass
    (0x4F, 0xA3, 0xC7), (0x9F, 0xD3, 0xEA), (0x4A, 0x6E, 0x8F), (0x6F, 0x8F, 0xB0),                      # river, sky, window, slate
    (0xB5, 0x52, 0x2A), (0xD0, 0x45, 0x2F), (0xA8, 0x5A, 0x48), (0xE8, 0xB2, 0x3A), (0xF2, 0xD1, 0x4E),  # brick, red, gold
    (0x1F, 0x2A, 0x1D),                                                                                  # ink
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
