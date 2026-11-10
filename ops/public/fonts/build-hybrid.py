#!/usr/bin/env python3
"""Build hybrid.chr from built-in CP437 CHARSET + petscii.chr remaps.

Restyles pure single-line box glyphs to 2-row H weight, then overlays
petscii groups A-F per the locked remap table.
"""

from __future__ import annotations

import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CHARSET_TS = ROOT / 'zss' / 'feature' / 'charset.ts'
PETSCII_CHR = HERE / 'petscii.chr'
OUT_CHR = HERE / 'hybrid.chr'

CELL_H = 14
GLYPH_BYTES = 256 * CELL_H

SINGLE_LINE = [179, 180, 191, 192, 193, 194, 195, 196, 197, 217, 218]

# hybrid dst <- petscii src
REMAP: list[tuple[int, int]] = [
    (171, 205),  # A \
    (172, 206),  # A /
    (181, 204),  # E BL
    (182, 223),  # B
    (183, 233),  # B
    (184, 196),  # C
    (185, 207),  # E TL
    (189, 197),  # C
    (190, 198),  # C
    (198, 250),  # E BR
    (199, 199),  # C
    (207, 200),  # C
    (208, 208),  # E TR
    (209, 210),  # C
    (210, 214),  # A X
    (211, 217),  # C
    (212, 201),  # D
    (213, 202),  # D
    (214, 203),  # D
    (215, 213),  # D
    (216, 219),  # F
]

A_DST = {171, 172, 210}
E_DST = {181, 185, 198, 208}
DEST = {d for d, _ in REMAP}
SINGLE_SET = set(SINGLE_LINE)


def load_builtin() -> bytearray:
    text = CHARSET_TS.read_text()
    match = re.search(r"CHARSET = hex2arr\(\s*'([0-9a-fA-F]+)'", text)
    if not match:
        raise SystemExit(f'CHARSET hex not found in {CHARSET_TS}')
    data = bytearray.fromhex(match.group(1))
    if len(data) != GLYPH_BYTES:
        raise SystemExit(f'expected {GLYPH_BYTES} builtin bytes, got {len(data)}')
    return data


def load_petscii() -> bytes:
    data = PETSCII_CHR.read_bytes()
    if len(data) != GLYPH_BYTES:
        raise SystemExit(f'expected {GLYPH_BYTES} petscii bytes, got {len(data)}')
    return data


def get_rows(buf: bytearray | bytes, ch: int) -> list[int]:
    off = ch * CELL_H
    return [buf[off + y] for y in range(CELL_H)]


def set_rows(buf: bytearray, ch: int, rows: list[int]) -> None:
    off = ch * CELL_H
    for y, byte in enumerate(rows):
        buf[off + y] = byte


def thicken_h(rows: list[int]) -> list[int]:
    """Expand 1-row horizontal bars to 2-row weight (match petscii group C)."""
    ink = [bin(b).count('1') for b in rows]
    hrows = [y for y, n in enumerate(ink) if n >= 5]
    if not hrows:
        return rows
    out = list(rows)
    bands: list[tuple[int, int]] = []
    start = prev = hrows[0]
    for y in hrows[1:]:
        if y == prev + 1:
            prev = y
        else:
            bands.append((start, prev))
            start = prev = y
    bands.append((start, prev))
    for a, b in bands:
        if b - a + 1 >= 2:
            continue
        y = a
        bar = out[y]
        if y + 1 < CELL_H:
            out[y + 1] = out[y + 1] | bar
        elif y - 1 >= 0:
            out[y - 1] = out[y - 1] | bar
    return out


def build_hybrid() -> bytearray:
    hybrid = load_builtin()
    petscii = load_petscii()
    for ch in SINGLE_LINE:
        set_rows(hybrid, ch, thicken_h(get_rows(hybrid, ch)))
    for dst, src in REMAP:
        hybrid[dst * CELL_H : (dst + 1) * CELL_H] = petscii[src * CELL_H : (src + 1) * CELL_H]
    return hybrid


def load_font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', size)
    except OSError:
        return ImageFont.load_default()


def blit_glyph(
    img: Image.Image,
    buf: bytes | bytearray,
    ch: int,
    x: int,
    y: int,
    scale: int,
    color: tuple[int, int, int],
) -> None:
    off = ch * CELL_H
    for row in range(CELL_H):
        byte = buf[off + row]
        for col in range(8):
            if byte & (0x80 >> col):
                for dy in range(scale):
                    for dx in range(scale):
                        img.putpixel((x + col * scale + dx, y + row * scale + dy), color)


def write_sheet(
    path: Path,
    buf: bytes | bytearray,
    title: str,
    highlight: bool,
) -> None:
    bg = (16, 16, 32)
    navy = (0, 0, 90)
    cyan = (0, 255, 255)
    yellow = (255, 220, 80)
    magenta = (255, 120, 200)
    green = (80, 220, 120)
    orange = (255, 160, 60)
    ltgray = (180, 180, 200)
    fg = (200, 200, 220)
    scale = 3
    cell_w, cell_h = 8 * scale, 14 * scale
    pad = 12
    gap = 2
    label = 16
    cols = 16
    tw = pad * 2 + cols * (cell_w + gap) - gap
    th = 70 + pad + 16 * (cell_h + label + gap) - gap + pad
    img = Image.new('RGB', (tw, th), bg)
    draw = ImageDraw.Draw(img)
    font = load_font(11)
    font_sm = load_font(9)
    draw.text((pad, 8), title, fill=ltgray, font=font)
    if highlight:
        draw.text(
            (pad, 28),
            'green=single restyle  orange=A  magenta=E  yellow=other remap',
            fill=ltgray,
            font=font_sm,
        )
        draw.text(
            (pad, 44),
            'pure doubles 186-188 / 200-206 unchanged',
            fill=ltgray,
            font=font_sm,
        )
    else:
        draw.text((pad, 28), 'built-in CP437 CHARSET (8x14)', fill=ltgray, font=font_sm)

    y0 = 70 + pad
    for ch in range(256):
        col, row = ch % 16, ch // 16
        x = pad + col * (cell_w + gap)
        y = y0 + row * (cell_h + label + gap)
        if highlight and (ch in DEST or ch in SINGLE_SET):
            if ch in SINGLE_SET:
                outline = (80, 180, 100)
            elif ch in A_DST:
                outline = (220, 140, 40)
            elif ch in E_DST:
                outline = (200, 80, 160)
            else:
                outline = (120, 120, 200)
            draw.rectangle([x - 1, y - 1, x + cell_w, y + cell_h], fill=navy, outline=outline)
        blit_glyph(img, buf, ch, x, y, scale, cyan)
        if highlight:
            if ch in SINGLE_SET:
                color = green
            elif ch in A_DST:
                color = orange
            elif ch in E_DST:
                color = magenta
            elif ch in DEST:
                color = yellow
            else:
                color = fg
        else:
            color = fg
        draw.text((x, y + cell_h + 1), f'{ch}', fill=color, font=font_sm)
    img.save(path)
    print(f'wrote {path}')


def write_mockup(path: Path, buf: bytes | bytearray) -> None:
    bg = (16, 16, 32)
    cyan = (0, 255, 255)
    ltgray = (180, 180, 200)
    scale = 4
    cell_w, cell_h = 8 * scale, 14 * scale
    pad = 12
    rows = [
        'HYBRID CHARSET',
        ''.join(chr(c) for c in [218, 196, 196, 194, 196, 196, 191]),
        ''.join(chr(c) for c in [179, 32, 32, 179, 32, 32, 179]),
        ''.join(chr(c) for c in [195, 196, 196, 197, 196, 196, 180]),
        ''.join(chr(c) for c in [179, 32, 32, 179, 32, 32, 179]),
        ''.join(chr(c) for c in [192, 196, 196, 193, 196, 196, 217]),
        '',
        'A ' + ''.join(chr(c) for c in [171, 172, 210]),
        'B ' + ''.join(chr(c) for c in [182, 183]),
        'E ' + ''.join(chr(c) for c in [181, 185, 208, 198]),
        'C ' + ''.join(chr(c) for c in [184, 189, 190, 209, 199, 207, 211]),
        'D ' + ''.join(chr(c) for c in [212, 213, 214, 215]),
        'F ' + chr(216),
    ]
    maxw = max(len(r) for r in rows)
    tw = pad * 2 + maxw * cell_w
    th = pad * 2 + 36 + len(rows) * cell_h
    img = Image.new('RGB', (tw, th), bg)
    draw = ImageDraw.Draw(img)
    draw.text((pad, 8), 'hybrid mockup — restyled box + remapped petscii A-F', fill=ltgray, font=load_font(11))
    for ri, row in enumerate(rows):
        for ci, ch in enumerate(row):
            code = ord(ch)
            x = pad + ci * cell_w
            y = pad + 36 + ri * cell_h
            blit_glyph(img, buf, code, x, y, scale, cyan)
    img.save(path)
    print(f'wrote {path}')


def main() -> None:
    hybrid = build_hybrid()
    OUT_CHR.write_bytes(hybrid)
    print(f'wrote {OUT_CHR} ({len(hybrid)} bytes)')

    builtin = load_builtin()
    write_sheet(HERE / 'builtin.preview.png', builtin, 'builtin CP437 CHARSET', highlight=False)
    write_sheet(
        HERE / 'hybrid.preview.png',
        hybrid,
        'hybrid — single-line restyle + petscii A-F remap (21)',
        highlight=True,
    )
    write_mockup(HERE / 'hybrid.mockup.png', hybrid)


if __name__ == '__main__':
    main()
