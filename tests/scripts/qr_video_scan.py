import cv2
from pyzbar import pyzbar
import sys
import os


def scan_video_for_qr(video_path: str, expected_codes: set, frame_skip: int = 10):
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found: {video_path}")

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise RuntimeError("Could not open video")

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_index = 0

    found_codes = set()

    print("Scanning video...\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_index % frame_skip == 0:
            qr_codes = pyzbar.decode(frame)

            for qr in qr_codes:
                data = qr.data.decode("utf-8").strip()

                if data in expected_codes and data not in found_codes:
                    timestamp = frame_index / fps
                    print(f"FOUND  : {data} at {timestamp:.2f}s")
                    found_codes.add(data)

                # Early exit if all found
                if found_codes == expected_codes:
                    break

        frame_index += 1

    cap.release()

    print("\n---- RESULT ----")

    not_found = expected_codes - found_codes

    for code in found_codes:
        print(f"FOUND     : {code}")

    for code in not_found:
        print(f"NOT FOUND : {code}")

    return found_codes, not_found


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python qr_video_scan.py <video_path> <QR1> <QR2> ...")
        sys.exit(1)

    video_file = sys.argv[1]
    expected = set(sys.argv[2:])

    scan_video_for_qr(video_file, expected)