"""Stage 1: sample sharp, evenly spaced frames from the video."""
from pathlib import Path

import cv2


def extract_frames(video: Path, out_dir: Path, fps: float = 3.0, max_side: int = 960) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise RuntimeError(f"cannot open video {video}")
    src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    window = max(1, round(src_fps / fps))

    paths: list[Path] = []
    best, best_score = None, -1.0
    n = 0

    def flush():
        nonlocal best, best_score
        if best is not None:
            p = out_dir / f"{len(paths):05d}.jpg"
            cv2.imwrite(str(p), best, [cv2.IMWRITE_JPEG_QUALITY, 95])
            paths.append(p)
        best, best_score = None, -1.0

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        h, w = frame.shape[:2]
        s = max_side / max(h, w)
        if s < 1:
            frame = cv2.resize(frame, (round(w * s), round(h * s)), interpolation=cv2.INTER_AREA)
        # keep the sharpest frame of each window (drops motion blur)
        score = cv2.Laplacian(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
        if score > best_score:
            best, best_score = frame, score
        n += 1
        if n % window == 0:
            flush()
    flush()
    cap.release()
    if len(paths) < 20:
        raise RuntimeError(f"only {len(paths)} frames extracted; video too short or unreadable")
    return paths
