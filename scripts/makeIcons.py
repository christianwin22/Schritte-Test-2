#!/usr/bin/env python3
"""
Draw the app's home-screen icons from the same mark the app shows in its top bar:
a white tile with three steps rising and darkening.

    python3 scripts/makeIcons.py

Writes public/icon.png (512) and public/apple-touch-icon.png (180). No image
library needed — the shapes are simple enough to rasterise here, at 4x and then
averaged down, which is what gives the edges their smoothness.
"""
import pathlib
import struct
import zlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "public"
SS = 4  # supersampling factor

# The mark, in a 512 box: x, y, width, height, corner radius, darkness (0..1)
STEPS = [
    (80, 304, 96, 112, 24, 0.35),
    (208, 192, 96, 224, 24, 0.70),
    (336, 96, 96, 320, 24, 1.00),
]
DOT = (384, 144, 19)          # the white peak on the tallest step
INK = (9, 9, 11)              # zinc-950, as the app uses
SCALE = 0.85                  # keeps the mark inside iOS's rounded mask


def inside_round_rect(px, py, x, y, w, h, r):
    cx = min(max(px, x + r), x + w - r)
    cy = min(max(py, y + r), y + h - r)
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r


def render(size):
    big = size * SS
    k = big / 512.0
    acc = [[(255, 255, 255)] * big for _ in range(big)]

    for row in range(big):
        py = ((row + 0.5) / k - 256) / SCALE + 256
        line = acc[row]
        for col in range(big):
            px = ((col + 0.5) / k - 256) / SCALE + 256
            colour = None
            for (x, y, w, h, r, darkness) in STEPS:
                if inside_round_rect(px, py, x, y, w, h, r):
                    colour = tuple(round(255 + (c - 255) * darkness) for c in INK)
                    break
            if colour and (px - DOT[0]) ** 2 + (py - DOT[1]) ** 2 <= DOT[2] ** 2:
                colour = (255, 255, 255)
            if colour:
                line[col] = colour

    # average each SS x SS block back down
    rows = []
    for row in range(size):
        out = bytearray([0])  # PNG filter byte: none
        for col in range(size):
            r = g = b = 0
            for dy in range(SS):
                for dx in range(SS):
                    pr, pg, pb = acc[row * SS + dy][col * SS + dx]
                    r += pr
                    g += pg
                    b += pb
            n = SS * SS
            out += bytes((r // n, g // n, b // n))
        rows.append(bytes(out))
    return b"".join(rows)


def write_png(path, size, raw):
    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)
    print(f"{path.name}: {size}x{size}, {len(png) // 1024} KB")


for name, size in [("icon.png", 512), ("apple-touch-icon.png", 180), ("apple-touch-icon-precomposed.png", 180)]:
    write_png(OUT / name, size, render(size))
