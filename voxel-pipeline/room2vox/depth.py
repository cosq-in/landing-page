"""Stage 3: monocular depth (Depth Anything V2) scaled per-frame to the COLMAP sparse points."""
import numpy as np


def pick_device():
    import torch
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


class DepthEstimator:
    def __init__(self, model_id="depth-anything/Depth-Anything-V2-Base-hf"):
        import torch
        from transformers import AutoImageProcessor, AutoModelForDepthEstimation
        self.torch = torch
        self.device = pick_device()
        print(f"[depth] {model_id} on {self.device}")
        self.proc = AutoImageProcessor.from_pretrained(model_id)
        self.model = AutoModelForDepthEstimation.from_pretrained(model_id).to(self.device).eval()

    def disparity(self, rgb: np.ndarray) -> np.ndarray:
        """Relative inverse depth, same HxW as rgb."""
        from PIL import Image
        torch = self.torch
        h, w = rgb.shape[:2]
        inp = self.proc(images=Image.fromarray(rgb), return_tensors="pt").to(self.device)
        with torch.no_grad():
            out = self.model(**inp).predicted_depth
        out = torch.nn.functional.interpolate(out[None], size=(h, w), mode="bicubic", align_corners=False)[0, 0]
        return out.float().cpu().numpy()


def metric_depth(disp: np.ndarray, kp_xy: np.ndarray, kp_z: np.ndarray, min_pts=12):
    """Fit disp ~= a/z + b on sparse points (robust), return depth in COLMAP units or None."""
    h, w = disp.shape
    x = np.clip(kp_xy[:, 0].astype(int), 0, w - 1)
    y = np.clip(kp_xy[:, 1].astype(int), 0, h - 1)
    ok = kp_z > 1e-6
    d, inv = disp[y[ok], x[ok]], 1.0 / kp_z[ok]
    if len(d) < min_pts:
        return None
    keep = np.ones(len(d), bool)
    for _ in range(3):
        A = np.stack([inv[keep], np.ones(keep.sum())], 1)
        a, b = np.linalg.lstsq(A, d[keep], rcond=None)[0]
        res = np.abs(a * inv + b - d)
        mad = np.median(res[keep]) + 1e-9
        keep = res < 3 * 1.4826 * mad
        if keep.sum() < min_pts:
            return None
    if a <= 0:
        return None
    z = a / np.maximum(disp - b, a / 50.0)       # clamp far field at 50 units
    z[(z < 0.05) | (z > 50)] = 0
    return z.astype(np.float32)
