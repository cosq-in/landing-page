"""Software-rendered walkthrough video of a voxel grid (no GPU / GL needed)."""
import subprocess
from pathlib import Path

import cv2
import numpy as np

_DIRS = [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)]
_SHADE = [0.80, 0.80, 1.0, 0.55, 0.88, 0.88]          # per-face-direction light, Minecraft-like


def unit_faces(grid, voxel_size):
    """Every exposed unit face as (corners[4,3], normal, palette_idx). Unit quads sort reliably."""
    padded = np.pad(grid, 1)
    quads, norms, cols, shade = [], [], [], []
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
        shade += [_SHADE[k]] * len(idx)
    return (np.concatenate(quads) * voxel_size, np.array(norms, float), np.concatenate(cols), np.array(shade))


def render_video(npz: Path, out: Path, seconds=12, fps=30, size=(960, 540), sky=(235, 215, 190)):
    d = np.load(npz)
    grid, palette, vs = d["grid"].astype(np.int32), d["palette"], float(d["voxel_size"])
    quads, norms, cols, shade = unit_faces(grid, vs)
    rgb = palette[cols].astype(np.float32) * shade[:, None]
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
        # walk along the long axis of the room at eye height while the view sweeps left/right
        long_ax = 0 if dims[0] > dims[2] else 2
        short_ax = 2 - long_ax
        pos = np.zeros(3)
        pos[1] = floor_y + 1.6
        pos[long_ax] = dims[long_ax] * (0.12 + 0.55 * (0.5 - 0.5 * np.cos(2 * np.pi * t)))
        pos[short_ax] = dims[short_ax] * 0.5
        yaw = 0.45 * np.sin(2 * np.pi * t) + (0 if long_ax == 2 else -np.pi / 2)
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
            cv2.polylines(img, [poly], True, tuple(int(c * 0.78) for c in col), 1, cv2.LINE_AA)
        proc.stdin.write(img.tobytes())
    proc.stdin.close()
    proc.wait()
    return out
