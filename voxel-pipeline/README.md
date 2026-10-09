# room2vox: room video to Minecraft-style voxel GLB

```
python -m room2vox room.mp4 -o out --voxel 0.10
```

Stages: frames (sharpest of each window) -> COLMAP SfM (pycolmap, CPU) -> Depth Anything V2
scaled per frame to the sparse points -> floor/gravity alignment + metric scale -> Open3D TSDF ->
yaw snap -> voxelise (10 cm) -> clean -> block palette (Lab nearest) -> greedy-meshed GLB.

Outputs `out/room.glb` (load in Flutter), `out/room_voxels.npz` (raw grid + palette),
`out/work/points.npz` (rerun voxel step only: `--from-points out/work/points.npz --voxel 0.15`).

Walkthrough video from a finished run:
`python -c "from room2vox.preview import render_video; render_video('out/room_voxels.npz','out/walkthrough.mp4')"`

## Running on a Mac or a render machine
- Same code on both: torch picks CUDA, then Apple MPS, then CPU. SfM runs on CPU (pycolmap),
  so a Mac is fine for ~150-300 frames (expect 10-30 min). Use CUDA if you have it for the depth stage.
- `pip install -r requirements.txt` (python 3.10-3.12 recommended for open3d/pycolmap wheels).

## Known limits
- Scale comes from a heuristic (`--ceiling-height`, default 2.5 m). Check the printed room extent
  and pass `--scale` if wrong.
- Textureless rooms can make COLMAP fail; film slowly with translation, not just rotation.
- Mesh faces point inward (room seen from inside); orbit-from-outside needs a cull-disabled material.
- The SfM/depth/TSDF stages need real footage to verify; voxel + mesh stages were tested on a synthetic room.
