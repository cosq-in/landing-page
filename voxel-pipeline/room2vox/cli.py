import argparse
import os
from pathlib import Path

os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")  # torch + pycolmap each ship libomp on macOS

import numpy as np


def main():
    ap = argparse.ArgumentParser(description="Room video -> Minecraft-style voxel GLB")
    ap.add_argument("video", type=Path)
    ap.add_argument("-o", "--out", type=Path, default=Path("out"))
    ap.add_argument("--voxel", type=float, default=0.10, help="block size in metres")
    ap.add_argument("--fps", type=float, default=3.0)
    ap.add_argument("--max-side", type=int, default=960)
    ap.add_argument("--ceiling-height", type=float, default=2.5, help="assumed floor-to-ceiling height (m) for scale")
    ap.add_argument("--scale", type=float, default=None, help="explicit COLMAP-units -> metres (overrides height heuristic)")
    ap.add_argument("--sfm", choices=["vggt", "colmap"], default="vggt")
    ap.add_argument("--vggt-frames", type=int, default=60)
    ap.add_argument("--vggt-short", type=int, default=336, help="short side px fed to VGGT (rounded to 14)")
    ap.add_argument("--no-shell", action="store_true", help="skip box fitting, voxelise the raw scan")
    ap.add_argument("--palette", choices=["minecraft", "scene"], default="minecraft")
    ap.add_argument("--depth-model", default="depth-anything/Depth-Anything-V2-Base-hf")
    ap.add_argument("--from-points", type=Path, help="skip to voxelisation using a saved points.npz")
    a = ap.parse_args()

    work = a.out / "work"
    work.mkdir(parents=True, exist_ok=True)

    if a.from_points:
        d = np.load(a.from_points)
        xyz, rgb = d["xyz"], d["rgb"]
    else:
        from .depth import DepthEstimator
        from .frames import extract_frames
        from .fuse import estimate_alignment, fuse
        from .sfm import run_sfm

        imgs = extract_frames(a.video, work / "frames", a.fps, a.max_side)
        print(f"[frames] {len(imgs)}")
        if a.sfm == "vggt":
            from .vggt_sfm import run_vggt
            frames, sparse = run_vggt(imgs, a.vggt_frames, a.vggt_short, cache=work / "vggt_cache.pkl")
            est = None
        else:
            frames, sparse = run_sfm(work / "frames", work)
            est = DepthEstimator(a.depth_model)
        R, s, floor_d = estimate_alignment(frames, sparse, a.ceiling_height, a.scale)
        xyz, rgb = fuse(frames, sparse, R, s, floor_d, est)
        np.savez_compressed(work / "points.npz", xyz=xyz, rgb=rgb)

    ext = xyz.max(0) - xyz.min(0)
    print(f"[room] extent {ext[0]:.2f} x {ext[2]:.2f} m, height {ext[1]:.2f} m  (if wrong, rerun with --scale)")

    from .mesh import export
    from .voxel import scene_palette, voxelize

    lum = rgb @ np.array([0.2126, 0.7152, 0.0722])
    rgb = np.clip(rgb * (0.85 / max(np.percentile(lum, 90), 1e-3)), 0, 1)   # phone video is dim: normalise exposure
    pal = scene_palette(rgb * 255) if a.palette == "scene" else None
    if a.no_shell:
        grid, palette, origin = voxelize(xyz, rgb, a.voxel, palette=pal)
    else:
        from .shell import build_room, fit_box
        grid, palette, origin = build_room(xyz, rgb, fit_box(xyz, a.ceiling_height), a.voxel, pal)
    export(grid, palette, origin, a.voxel, a.out)


if __name__ == "__main__":
    main()
