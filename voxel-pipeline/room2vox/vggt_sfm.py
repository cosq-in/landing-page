"""Stage 2 (alt): camera poses + dense depth from VGGT, a feed-forward model that copes with
textureless rooms and fast pans where COLMAP loses track. Works on CUDA, Apple MPS and CPU."""
from pathlib import Path

import cv2
import numpy as np

from .depth import pick_device
from .sfm import Frame


def run_vggt(images: list[Path], n_frames=24, short_side=252, conf_pct=40.0, model_id="facebook/VGGT-1B"):
    import torch
    from vggt.models.vggt import VGGT
    from vggt.utils.pose_enc import pose_encoding_to_extri_intri

    sel = np.unique(np.linspace(0, len(images) - 1, min(n_frames, len(images))).round().astype(int))
    paths = [images[i] for i in sel]
    rgbs = []
    for p in paths:
        im = cv2.cvtColor(cv2.imread(str(p)), cv2.COLOR_BGR2RGB)
        h, w = im.shape[:2]
        s = short_side / min(h, w)
        W, H = round(w * s / 14) * 14, round(h * s / 14) * 14
        rgbs.append(cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA))
    H, W = rgbs[0].shape[:2]
    x = torch.from_numpy(np.stack(rgbs)).permute(0, 3, 1, 2).float() / 255.0

    device = pick_device()
    print(f"[vggt] {len(paths)} frames at {W}x{H} on {device}")
    model = VGGT.from_pretrained(model_id).to(device).eval()
    with torch.no_grad():
        pred = model(x.to(device))
        extr, intr = pose_encoding_to_extri_intri(pred["pose_enc"], (H, W))
    extr, intr = extr[0].float().cpu().numpy(), intr[0].float().cpu().numpy()
    depth = pred["depth"][0, ..., 0].float().cpu().numpy()
    conf = pred["depth_conf"][0].float().cpu().numpy()
    del model, pred

    thr = np.percentile(conf, conf_pct)
    frames, pts, cols = [], [], []
    ys, xs = np.mgrid[0:H, 0:W]
    for i, p in enumerate(paths):
        K, E = intr[i], extr[i]
        d = depth[i].copy()
        d[conf[i] < thr] = 0
        f = Frame(p, K, np.zeros(4), E[:, :3], E[:, 3], np.zeros((0, 2)), np.zeros((0, 3)), (W, H))
        f.depth, f.rgb = d, rgbs[i]
        frames.append(f)
        m = d > 0
        cam = np.stack([(xs[m] - K[0, 2]) / K[0, 0] * d[m], (ys[m] - K[1, 2]) / K[1, 1] * d[m], d[m]], 1)
        pts.append((cam - E[:, 3]) @ E[:, :3])          # world = R^T (cam - t)
    return frames, np.concatenate(pts)
