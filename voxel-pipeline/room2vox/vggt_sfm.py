"""Stage 2 (alt): camera poses + dense depth from VGGT, a feed-forward model that copes with
textureless rooms and fast pans where COLMAP loses track. Works on CUDA, Apple MPS and CPU.

Long videos run as overlapping chunks (VGGT attention cost grows with frames^2); chunks are stitched
with a Sim(3) fitted on the pixels shared by the overlapping frames (pans have almost no camera
translation, so camera centres alone cannot fix the scale)."""
import pickle
from pathlib import Path

import cv2
import numpy as np

from .depth import pick_device
from .sfm import Frame


def _prep(path, short_side):
    im = cv2.cvtColor(cv2.imread(str(path)), cv2.COLOR_BGR2RGB)
    h, w = im.shape[:2]
    s = short_side / min(h, w)
    return cv2.resize(im, (round(w * s / 14) * 14, round(h * s / 14) * 14), interpolation=cv2.INTER_AREA)


def _infer(model, device, rgbs):
    import torch
    from vggt.utils.pose_enc import pose_encoding_to_extri_intri
    H, W = rgbs[0].shape[:2]
    x = torch.from_numpy(np.stack(rgbs)).permute(0, 3, 1, 2).float() / 255.0
    with torch.no_grad():
        pred = model(x.to(device))
        extr, intr = pose_encoding_to_extri_intri(pred["pose_enc"], (H, W))
    out = dict(extr=extr[0].float().cpu().numpy(), intr=intr[0].float().cpu().numpy(),
               depth=pred["depth"][0, ..., 0].float().cpu().numpy(), conf=pred["depth_conf"][0].float().cpu().numpy())
    if device == "mps":
        torch.mps.empty_cache()
    return out


def unproject(depth, K, E, stride=1):
    """World points (chunk frame) for every pixel of one frame; returns (pts[H',W',3], valid mask)."""
    H, W = depth.shape
    ys, xs = np.mgrid[0:H:stride, 0:W:stride]
    d = depth[ys, xs]
    cam = np.stack([(xs - K[0, 2]) / K[0, 0] * d, (ys - K[1, 2]) / K[1, 1] * d, d], -1)
    return (cam - E[:, 3]) @ E[:, :3], d > 0


def _sim3(src, dst, iters=3):
    """Least-squares similarity dst ~ s * R @ src + t (Umeyama), refit on the closest 80% each pass."""
    keep = np.ones(len(src), bool)
    for _ in range(iters):
        a, b = src[keep], dst[keep]
        ma, mb = a.mean(0), b.mean(0)
        U, S, Vt = np.linalg.svd((b - mb).T @ (a - ma) / len(a))
        D = np.diag([1, 1, np.sign(np.linalg.det(U @ Vt))])
        R = U @ D @ Vt
        s = np.trace(np.diag(S) @ D) / ((a - ma) ** 2).sum(1).mean()
        t = mb - s * R @ ma
        err = np.linalg.norm(dst - (s * src @ R.T + t), axis=1)
        keep = err <= np.percentile(err, 80)
    return s, R, t


def run_vggt(images: list[Path], n_frames=60, short_side=336, chunk=12, overlap=4, conf_pct=35.0,
             model_id="facebook/VGGT-1B", cache: Path | None = None):
    import torch
    from vggt.models.vggt import VGGT

    sel = np.unique(np.linspace(0, len(images) - 1, min(n_frames, len(images))).round().astype(int))
    paths = [images[i] for i in sel]
    step = chunk - overlap
    starts = list(range(0, max(1, len(paths) - overlap), step))
    if starts[-1] + chunk < len(paths):
        starts.append(len(paths) - chunk)
    starts = [max(0, min(s, len(paths) - chunk)) for s in starts]
    chunks = sorted(set((s, min(s + chunk, len(paths))) for s in starts))

    if cache and cache.exists():
        raw = pickle.loads(cache.read_bytes())
        print(f"[vggt] loaded cached predictions ({len(raw['chunks'])} chunks)")
    else:
        rgbs = [_prep(p, short_side) for p in paths]
        device = pick_device()
        print(f"[vggt] {len(paths)} frames in {len(chunks)} chunks at {rgbs[0].shape[1]}x{rgbs[0].shape[0]} on {device}")
        model = VGGT.from_pretrained(model_id).to(device).eval()
        outs = []
        for k, (a, b) in enumerate(chunks):
            outs.append(((a, b), _infer(model, device, rgbs[a:b])))
            print(f"[vggt] chunk {k + 1}/{len(chunks)}")
        raw = dict(chunks=outs, rgbs=rgbs)
        if cache:
            cache.write_bytes(pickle.dumps(raw))
        del model

    rgbs = raw["rgbs"]
    final = {}            # frame idx -> (K, R, t, depth) in the first chunk's world frame, scaled consistently
    for (a, b), o in raw["chunks"]:
        thr = np.percentile(o["conf"], conf_pct)
        depth = np.where(o["conf"] >= thr, o["depth"], 0.0)
        if not final:
            for j, i in enumerate(range(a, b)):
                final[i] = (o["intr"][j], o["extr"][j][:, :3], o["extr"][j][:, 3], depth[j])
            continue
        src, dst = [], []
        for j, i in enumerate(range(a, b)):
            if i in final:
                Kg, Rg, tg, dg = final[i]
                pg, vg = unproject(dg, Kg, np.concatenate([Rg, tg[:, None]], 1), stride=4)
                pc, vc = unproject(depth[j], o["intr"][j], o["extr"][j], stride=4)
                m = vg & vc
                src.append(pc[m]); dst.append(pg[m])
        if not src or sum(len(x) for x in src) < 200:
            print(f"[vggt] chunk starting at {a} has no usable overlap; stopping at {a}")
            break
        s, Q, b0 = _sim3(np.concatenate(src), np.concatenate(dst))
        for j, i in enumerate(range(a, b)):
            if i in final:
                continue
            Rc, tc = o["extr"][j][:, :3], o["extr"][j][:, 3]
            Rn = Rc @ Q.T                           # cam_from_world in the global frame
            final[i] = (o["intr"][j], Rn, s * tc - Rn @ b0, depth[j] * s)

    frames, pts = [], []
    for i in sorted(final):
        K, R, t, d = final[i]
        H, W = d.shape
        f = Frame(paths[i], K, np.zeros(4), R, t, np.zeros((0, 2)), np.zeros((0, 3)), (W, H))
        f.depth, f.rgb = d, rgbs[i]
        frames.append(f)
        p, v = unproject(d, K, np.concatenate([R, t[:, None]], 1), stride=2)
        pts.append(p[v])
    print(f"[vggt] stitched {len(frames)} frames")
    return frames, np.concatenate(pts)
