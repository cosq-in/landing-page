"""Software-rendered walkthrough video of a voxel grid (no GPU / GL needed)."""
import subprocess
from pathlib import Path

import cv2
import numpy as np

_DIRS = [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)]
_SHADE = [0.88, 0.88, 1.0, 0.62, 0.94, 0.94]          # per-face-direction light (map: roof bright, walls softer)
INK = (0x1F, 0x2A, 0x1D)                              # KurukuruColors.ink, the map outline colour
SKY = (0x9F, 0xD3, 0xEA)                              # KurukuruColors.sky
CHECK = 0.035                                         # ground checker contrast, like the map's A/B tones


def unit_faces(grid, voxel_size):
    """Every exposed unit face as (corners[4,3], normal, palette_idx). Unit quads sort reliably."""
    padded = np.pad(grid, 1)
    quads, norms, cols, shade, cells, dirs_k = [], [], [], [], [], []
    for k, d in enumerate(_DIRS):
        ax = int(np.argmax(np.abs(d)))
        sgn = d[ax]
        nb = np.roll(padded, -sgn, axis=ax)[1:-1, 1:-1, 1:-1]
        idx = np.argwhere((grid > 0) & (nb == 0))
        p, q = [a for a in range(3) if a != ax]
        base = idx.astype(float)
        base[:, ax] += 1 if sgn > 0 else 0
        c = [np.zeros((len(idx), 3)) for _ in range(4)]
        for corner, (dp, dq) in zip(c, ((0, 0), (1, 0), (1, 1), (0, 1))):
            corner[:] = base
            corner[:, p] += dp
            corner[:, q] += dq
        quads.append(np.stack(c, 1))
        norms += [d] * len(idx)
        cols.append(grid[tuple(idx.T)] - 1)
        cells.append(idx)
        dirs_k += [k] * len(idx)
        shade += [_SHADE[k]] * len(idx)
    return (np.concatenate(quads) * voxel_size, np.array(norms, float), np.concatenate(cols), np.array(shade),
            np.concatenate(cells), np.array(dirs_k))


def render_video(npz: Path, out: Path, seconds=12, fps=30, size=(960, 540), sky=SKY, mode="walk", cut_top=0.12):
    d = np.load(npz)
    grid, palette, vs = d["grid"].astype(np.int32), d["palette"], float(d["voxel_size"])
    if mode == "orbit":                                   # dollhouse: drop the ceiling so the inside shows
        occ_y = np.flatnonzero((grid > 0).any((0, 2)))
        cut = int(occ_y.max() - cut_top * (occ_y.max() - occ_y.min()))
        grid = grid.copy()
        grid[:, cut:, :] = 0
    quads, norms, cols, shade, cells, dk = unit_faces(grid, vs)
    # soft checker on upward faces (the map's ground A/B tones)
    chk = np.where((dk == 2) & ((cells[:, 0] + cells[:, 2]) % 2 == 0), 1 + CHECK, 1.0)
    rgb = np.clip(palette[cols].astype(np.float32) * (shade * chk)[:, None], 0, 255)
    # edge flags: a unit-face edge gets an ink line unless the in-plane neighbour face has the same colour
    lookup = {}
    for j in range(len(cols)):
        lookup[(int(dk[j]), *cells[j])] = int(cols[j])
    edges = np.zeros((len(cols), 4), bool)
    for j in range(len(cols)):
        k = int(dk[j]); ax = k // 2
        p_, q_ = [a for a in range(3) if a != ax]
        cx_ = cells[j]
        # corners (0,0),(1,0),(1,1),(0,1) in (p,q): edge0 sits at q=0, edge1 at p=1, edge2 at q=1, edge3 at p=0
        for e, (ap, dd) in enumerate(((q_, -1), (p_, 1), (q_, 1), (p_, -1))):
            nb = cx_.copy(); nb[ap] += dd
            edges[j, e] = lookup.get((k, *nb)) != int(cols[j])
    bgr = rgb[:, ::-1]
    cen = quads.mean(1)
    dims = np.array(grid.shape) * vs
    W, H = size
    f = 0.6 * W
    n = seconds * fps

    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}",
           "-r", str(fps), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20",
           "-movflags", "+faststart", str(out)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    solid = np.argwhere(grid > 0)
    floor_y = solid[:, 1].min() * vs
    for i in range(n):
        t = i / n
        if mode == "orbit":
            ctr = np.array([dims[0] / 2, (floor_y + dims[1] * 0.25), dims[2] / 2])
            rad, el, az = 1.0 * max(dims[0], dims[2]) + 1.2, np.radians(60), 2 * np.pi * t
            pos = ctr + rad * np.array([np.sin(az) * np.cos(el), np.sin(el), np.cos(az) * np.cos(el)])
            fwd = (ctr - pos) / np.linalg.norm(ctr - pos)
        else:
            fwd = None
            # walk along the long axis of the room at eye height while the view sweeps left/right
            long_ax = 0 if dims[0] > dims[2] else 2
            short_ax = 2 - long_ax
            pos = np.zeros(3)
            pos[1] = floor_y + 1.6
            pos[long_ax] = dims[long_ax] * (0.12 + 0.55 * (0.5 - 0.5 * np.cos(2 * np.pi * t)))
            pos[short_ax] = dims[short_ax] * 0.5
            yaw = 0.45 * np.sin(2 * np.pi * t) + (0 if long_ax == 2 else -np.pi / 2)
        if fwd is None:
            fwd = np.array([np.sin(yaw), -0.22, np.cos(yaw)])
            fwd /= np.linalg.norm(fwd)
        right = np.cross([0, 1, 0], fwd)
        right /= np.linalg.norm(right)
        up = np.cross(fwd, right)
        R = np.stack([right, -up, fwd])                      # world -> cam (x right, y down, z fwd)

        img = np.full((H, W, 3), sky[::-1], np.uint8)
        vis = ((cen - pos) @ fwd > 0.05) & (((pos - cen) * norms).sum(1) > 0)   # in front + back-face cull
        idx = np.flatnonzero(vis)
        cam = (quads[idx] - pos) @ R.T                        # (m,4,3)
        ok = (cam[:, :, 2] > 0.15).all(1)
        idx, cam = idx[ok], cam[ok]
        px = f * cam[:, :, 0] / cam[:, :, 2] + W / 2
        py = f * cam[:, :, 1] / cam[:, :, 2] + H / 2
        dist = np.linalg.norm(cen[idx] - pos, axis=1)
        for j in np.argsort(-dist):
            poly = np.stack([px[j], py[j]], 1).astype(np.int32)
            if poly[:, 0].max() < 0 or poly[:, 0].min() > W or poly[:, 1].max() < 0 or poly[:, 1].min() > H:
                continue
            col = tuple(int(c) for c in bgr[idx[j]])
            cv2.fillConvexPoly(img, poly, col)
            e = edges[idx[j]]
            for k2 in range(4):
                if e[k2]:
                    cv2.line(img, tuple(poly[k2]), tuple(poly[(k2 + 1) % 4]), INK[::-1], 2, cv2.LINE_AA)
        proc.stdin.write(img.tobytes())
    proc.stdin.close()
    proc.wait()
    return out
