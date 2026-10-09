"""Stage 6: greedy-meshed GLB (only exposed faces) + raw voxel npz."""
from pathlib import Path

import numpy as np


def _greedy_2d(mask):
    A, B = mask.shape
    used = np.zeros(mask.shape, bool)
    rects = []
    for a in range(A):
        b = 0
        while b < B:
            c = mask[a, b]
            if c == 0 or used[a, b]:
                b += 1
                continue
            w = 1
            while b + w < B and mask[a, b + w] == c and not used[a, b + w]:
                w += 1
            h = 1
            while a + h < A and (mask[a + h, b:b + w] == c).all() and not used[a + h, b:b + w].any():
                h += 1
            used[a:a + h, b:b + w] = True
            rects.append((a, b, h, w, c))
            b += w
    return rects


def greedy_mesh(grid, voxel_size=1.0):
    """Quads for exposed faces, merged per colour. Returns (verts, tris, face_palette_idx, normals)."""
    padded = np.pad(grid, 1)
    verts, tris, cols, nrms = [], [], [], []
    for axis in range(3):
        p, q = [a for a in range(3) if a != axis]
        cyc = 1 if (axis, p, q) in ((0, 1, 2), (1, 2, 0), (2, 0, 1)) else -1   # e_p x e_q = cyc * e_axis
        for sign in (1, -1):
            for i in range(grid.shape[axis]):
                cur = np.take(padded, i + 1, axis=axis)[1:-1, 1:-1]
                nbr = np.take(padded, i + 1 + sign, axis=axis)[1:-1, 1:-1]
                mask = np.where((cur > 0) & (nbr == 0), cur, 0)
                if not mask.any():
                    continue
                plane = i + 1 if sign == 1 else i
                for a, b, h, w, c in _greedy_2d(mask):
                    quad = []
                    for da, db in ((0, 0), (h, 0), (h, w), (0, w)):
                        v = [0.0, 0.0, 0.0]
                        v[axis], v[p], v[q] = plane, a + da, b + db
                        quad.append(v)
                    n0 = len(verts)
                    verts += quad
                    order = (0, 1, 2, 3) if sign * cyc > 0 else (0, 3, 2, 1)
                    o = [n0 + k for k in order]
                    tris += [(o[0], o[1], o[2]), (o[0], o[2], o[3])]
                    cols += [c - 1] * 2
                    nv = [0.0, 0.0, 0.0]
                    nv[axis] = float(sign)
                    nrms += [nv] * 4
    return (np.array(verts) * voxel_size, np.array(tris), np.array(cols), np.array(nrms))


def export(grid, palette, origin, voxel_size, out_dir: Path, name="room"):
    import trimesh
    out_dir.mkdir(parents=True, exist_ok=True)
    verts, tris, cols, nrms = greedy_mesh(grid, voxel_size)
    # centre in XZ, floor at y=0
    shift = np.array([grid.shape[0], 0, grid.shape[2]]) * voxel_size / 2
    verts = verts - shift
    rgba = np.concatenate([palette[cols].astype(np.uint8), np.full((len(cols), 1), 255, np.uint8)], 1)
    # one colour per triangle -> duplicate verts per triangle so colours do not blend
    v = verts[tris].reshape(-1, 3)
    vn = nrms[tris].reshape(-1, 3)
    f = np.arange(len(v)).reshape(-1, 3)
    vc = np.repeat(rgba, 3, axis=0)
    mesh = trimesh.Trimesh(vertices=v, faces=f, vertex_normals=vn, vertex_colors=vc, process=False)
    glb = out_dir / f"{name}.glb"
    mesh.export(glb)
    np.savez_compressed(out_dir / f"{name}_voxels.npz", grid=grid.astype(np.uint8), palette=palette.astype(np.uint8),
                        voxel_size=voxel_size, origin=origin)
    print(f"[mesh] {len(tris)} triangles ({int((grid > 0).sum())} blocks) -> {glb} ({glb.stat().st_size // 1024} KB)")
    return glb
