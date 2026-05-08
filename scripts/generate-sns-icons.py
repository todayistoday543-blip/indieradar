"""
IndieRadar SNS icons — Times New Roman Bold IR with gold growth arrow.
Renders R letterform, masks only the diagonal leg, replaces with upward arrow.
"""

from PIL import Image, ImageDraw, ImageFont
import os, math

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'sns-icons')
os.makedirs(OUTPUT_DIR, exist_ok=True)

BG_COLOR   = (20, 20, 22)
TEXT_COLOR = (232, 224, 212)
GOLD_COLOR = (212, 162, 74)
FONT_PATH  = r'C:\Windows\Fonts\timesbd.ttf'

SIZES = {
    'twitter':    (400,  400),
    'instagram':  (320,  320),
    'facebook':   (180,  180),
    'youtube':    (800,  800),
    'linkedin':   (400,  400),
    'discord':    (512,  512),
    'github':     (500,  500),
    'tiktok':     (200,  200),
    'threads':    (320,  320),
    'og-square':  (1200, 1200),
}


def poly_line(draw, x0, y0, x1, y1, w, color):
    a = math.atan2(y1 - y0, x1 - x0)
    dx, dy = math.sin(a) * w / 2, math.cos(a) * w / 2
    draw.polygon([
        (x0 - dx, y0 + dy), (x0 + dx, y0 - dy),
        (x1 + dx, y1 - dy), (x1 - dx, y1 + dy),
    ], fill=color)


def draw_arrowhead(draw, tx, ty, bx, by, hlen, hw, color):
    angle = math.atan2(ty - by, tx - bx)
    perp  = angle + math.pi / 2
    ox = tx - math.cos(angle) * hlen
    oy = ty - math.sin(angle) * hlen
    draw.polygon([
        (tx, ty),
        (ox + math.cos(perp)*hw/2, oy + math.sin(perp)*hw/2),
        (ox - math.cos(perp)*hw/2, oy - math.sin(perp)*hw/2),
    ], fill=color)


def draw_ir_icon(size):
    w, h = size
    img  = Image.new('RGB', (w, h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Rounded background
    cr = int(w * 0.13)
    draw.rounded_rectangle([0, 0, w-1, h-1], radius=cr, fill=BG_COLOR)

    # Font — sized so letters fill ~72% of canvas height
    font_size = int(h * 0.72)
    font = ImageFont.truetype(FONT_PATH, font_size)

    bb_I = font.getbbox('I')
    bb_R = font.getbbox('R')

    i_w  = bb_I[2] - bb_I[0]
    r_w  = bb_R[2] - bb_R[0]
    i_h  = bb_I[3] - bb_I[1]   # cap height
    gap  = int(w * 0.05)

    total_w = i_w + gap + r_w
    sx = max(int((w - total_w) / 2 - bb_I[0]), int(w * 0.04))  # start x
    sy = int((h - i_h) / 2) - bb_I[1]                           # start y

    # ── Draw I ──────────────────────────────────────────────────────────
    draw.text((sx, sy), 'I', font=font, fill=TEXT_COLOR)

    # ── Draw R ──────────────────────────────────────────────────────────
    rx = sx + i_w + gap        # R left edge (with bearing)
    draw.text((rx, sy), 'R', font=font, fill=TEXT_COLOR)

    # In Times Bold R:
    #   - Bowl bottom ≈ 53% of cap height from cap top
    #   - Leg junction x ≈ 28% of advance width from left
    #   - Leg ends at bottom-right of glyph
    r_top   = sy + bb_R[1]                      # absolute top of R cap
    r_bot   = sy + bb_R[3]                      # absolute baseline
    cap_h   = bb_R[3] - bb_R[1]

    junc_y  = r_top + int(cap_h * 0.54)         # where leg starts (y)
    junc_x  = rx + bb_R[0] + int(r_w * 0.26)   # where leg starts (x)

    # Mask the R's diagonal leg: triangle covering lower-right of R
    # Points: junction → bottom-right → bottom-left (of leg area)
    mask = [
        (junc_x - int(r_w * 0.02), junc_y - int(cap_h * 0.02)),
        (rx + bb_R[2] + int(w * 0.04), r_bot + int(h * 0.1)),
        (junc_x - int(r_w * 0.10), r_bot + int(h * 0.1)),
    ]
    draw.polygon(mask, fill=BG_COLOR)

    # Clean up any stray cream pixels below R (full-width below baseline)
    draw.rectangle([rx, r_bot, rx + bb_R[2] + int(w * 0.05), h], fill=BG_COLOR)

    # ── Gold growth arrow ────────────────────────────────────────────────
    sw        = max(int(w * 0.065), 2)

    # Tail: junction; Tip: upper-right (beyond R's bowl top-right)
    ax0, ay0  = junc_x, junc_y
    ax1, ay1  = rx + bb_R[2] + int(w * 0.03), r_top - int(h * 0.01)

    alen      = math.hypot(ax1 - ax0, ay1 - ay0)
    hlen      = alen * 0.20
    hw        = sw * 2.3
    bex       = ax0 + (ax1 - ax0) * (1 - hlen / alen)
    bey       = ay0 + (ay1 - ay0) * (1 - hlen / alen)

    poly_line(draw, ax0, ay0, bex, bey, sw, GOLD_COLOR)
    draw_arrowhead(draw, ax1, ay1, ax0, ay0, hlen, hw, GOLD_COLOR)

    return img


def main():
    for name, size in SIZES.items():
        img  = draw_ir_icon(size)
        path = os.path.join(OUTPUT_DIR, f'indieradar-{name}.png')
        img.save(path, 'PNG', optimize=True)
        print(f'  OK {name:14s} {size[0]}x{size[1]}')

    master    = draw_ir_icon((256, 256))
    ico_sizes = [(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)]
    ico_imgs  = [master.resize(s, Image.LANCZOS) for s in ico_sizes]
    ico_path  = os.path.join(OUTPUT_DIR, 'indieradar.ico')
    ico_imgs[0].save(ico_path, format='ICO', sizes=ico_sizes, append_images=ico_imgs[1:])
    print(f'  OK ico            multi')
    print(f'\nDone -> {os.path.abspath(OUTPUT_DIR)}')


if __name__ == '__main__':
    main()
