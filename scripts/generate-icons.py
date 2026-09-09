#!/usr/bin/env python3
"""Generate the dependency-free retro PWA icons."""

import binascii
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'src' / 'resource' / 'pwa'


def draw_icon(size):
    scale = size / 512
    pixels = [[(239, 204, 25) for _ in range(size)] for _ in range(size)]

    def rectangle(x1, y1, x2, y2, color):
        left = int(x1 * scale)
        top = int(y1 * scale)
        right = int(x2 * scale)
        bottom = int(y2 * scale)
        for y in range(top, bottom):
            for x in range(left, right):
                pixels[y][x] = color

    def circle(cx, cy, radius, color):
        center_x = cx * scale
        center_y = cy * scale
        radius_scaled = radius * scale
        radius_squared = radius_scaled * radius_scaled
        for y in range(max(0, int(center_y - radius_scaled)), min(size, int(center_y + radius_scaled + 1))):
            for x in range(max(0, int(center_x - radius_scaled)), min(size, int(center_x + radius_scaled + 1))):
                if ((x - center_x) ** 2) + ((y - center_y) ** 2) <= radius_squared:
                    pixels[y][x] = color

    rectangle(56, 38, 456, 474, (17, 17, 17))
    rectangle(72, 54, 440, 458, (239, 204, 25))
    rectangle(88, 74, 424, 354, (73, 69, 54))
    rectangle(96, 82, 416, 346, (158, 173, 134))
    for x1, y1 in ((132, 270), (176, 270), (220, 226), (220, 270),
                   (264, 270), (308, 226), (308, 270), (352, 270)):
        rectangle(x1, y1, x1 + 40, y1 + 40, (17, 17, 17))
    circle(355, 404, 34, (220, 51, 51))
    circle(264, 424, 34, (70, 82, 243))
    circle(158, 404, 34, (14, 196, 0))

    rows = [b'\x00' + bytes(channel for pixel in row for channel in pixel) for row in pixels]
    raw = b''.join(rows)

    def chunk(name, data):
        return struct.pack('>I', len(data)) + name + data + struct.pack(
            '>I', binascii.crc32(name + data) & 0xffffffff)

    return (b'\x89PNG\r\n\x1a\n' +
            chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)) +
            chunk(b'IDAT', zlib.compress(raw, 9)) +
            chunk(b'IEND', b''))


OUTPUT.mkdir(parents=True, exist_ok=True)
for icon_size in (192, 512):
    (OUTPUT / ('icon-%d.png' % icon_size)).write_bytes(draw_icon(icon_size))
