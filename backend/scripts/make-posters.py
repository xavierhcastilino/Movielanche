#!/usr/bin/env python3
"""
Generates placeholder movie posters as real, valid PNGs.

The seed referenced /posters/<name>.jpg but no image files were ever committed,
so every poster request fell through the SPA fallback and returned index.html
with a 200 -- a broken image that looked like a working backend.

These are plain colour-block placeholders, NOT artwork. Replace them with real
assets (or TMDB images) before any real deployment.

PNG rather than JPEG deliberately: a valid PNG is ~20 lines of zlib+CRC, while a
hand-rolled JPEG encoder is easy to get subtly wrong. Use sharp/imagemagick if
you want to swap in real photography.
"""
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "posters")

# (top colour, bottom colour)
POSTERS = {
    "inception":    ((28, 42, 84),   (96, 148, 214)),
    "interstellar": ((10, 18, 40),   (214, 158, 62)),
    "dune2":        ((58, 40, 22),   (222, 168, 84)),
    "rrr":          ((52, 16, 30),   (226, 96, 74)),
    "kantara":      ((16, 44, 32),   (96, 198, 132)),
    "kalki":        ((40, 20, 58),   (176, 108, 220)),
}

W, H = 300, 450


def chunk(tag: bytes, data: bytes) -> bytes:
    return (struct.pack(">I", len(data)) + tag + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))


def write_png(path: str, top, bottom) -> int:
    raw = bytearray()
    for y in range(H):
        raw.append(0)  # filter type 0 (None) for this scanline
        t = y / (H - 1)
        r = round(top[0] + (bottom[0] - top[0]) * t)
        g = round(top[1] + (bottom[1] - top[1]) * t)
        b = round(top[2] + (bottom[2] - top[2]) * t)
        row = bytes((r, g, b)) * W
        raw += row

    ihdr = struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)  # 8-bit truecolour RGB
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
           + chunk(b"IEND", b""))

    with open(path, "wb") as f:
        f.write(png)
    return len(png)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, (top, bottom) in POSTERS.items():
        p = os.path.join(OUT, name + ".png")
        size = write_png(p, top, bottom)
        print("  {}  {:>7} bytes".format(os.path.basename(p), size))
    print("wrote {} posters to {}".format(len(POSTERS), os.path.normpath(OUT)))


if __name__ == "__main__":
    main()