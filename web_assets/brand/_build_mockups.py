"""Build 3 favicon design variations for Jerry — M-forward with a car silhouette
ghosted behind. 512x512 + 32x32 size-test for each.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BRAND_DIR = Path(r"C:/Users/frost/Documents/JB/pka/businesses/maxim-autos/website/web_assets/brand")
MOCK_DIR = BRAND_DIR / "mockups"
MOCK_DIR.mkdir(parents=True, exist_ok=True)
SRC = BRAND_DIR / "logo-cropped.png"

NAVY = (11, 55, 87, 255)         # sampled from wordmark
ORANGE = (240, 128, 16, 255)     # brand orange #f08010
WHITE = (255, 255, 255, 255)
OFFWHITE = (252, 250, 247, 255)

FONTS = Path("C:/Windows/Fonts")
SIZE = 512


# ---- Pull the orange car silhouette from logo-cropped.png ----
def extract_car() -> Image.Image:
    src = Image.open(SRC).convert("RGBA")
    w, h = src.size
    px = src.load()
    cols = [sum(1 for y in range(h) if px[x, y][3] > 50) for x in range(w)]
    gap = None
    for x in range(100, w):
        if all(cols[i] == 0 for i in range(x, min(x + 20, w))):
            gap = x
            break
    car = src.crop((0, 0, gap, h))
    return car.crop(car.getbbox())


CAR = extract_car()


def recolor(img: Image.Image, rgb: tuple[int, int, int]) -> Image.Image:
    """Replace non-transparent pixel color while preserving alpha."""
    out = img.copy()
    data = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            if a > 0:
                data[x, y] = (rgb[0], rgb[1], rgb[2], a)
    return out


def set_opacity(img: Image.Image, factor: float) -> Image.Image:
    out = img.copy()
    data = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            data[x, y] = (r, g, b, int(a * factor))
    return out


def car_outline(img: Image.Image, rgb: tuple[int, int, int], thickness: int = 6) -> Image.Image:
    """Approximate an outline by subtracting an eroded copy from the silhouette."""
    from PIL import ImageFilter
    mask = img.split()[3]
    # Edges = original alpha minus shrunken alpha
    shrunk = mask.filter(ImageFilter.MinFilter(thickness * 2 + 1))
    edge = Image.eval(mask, lambda v: v)
    edge_pixels = edge.load()
    shrunk_pixels = shrunk.load()
    w, h = edge.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()
    for y in range(h):
        for x in range(w):
            ev = edge_pixels[x, y]
            sv = shrunk_pixels[x, y]
            diff = max(0, ev - sv)
            if diff > 20:
                op[x, y] = (rgb[0], rgb[1], rgb[2], diff)
    return out


def fit_to_box(img: Image.Image, box_w: int, box_h: int) -> Image.Image:
    iw, ih = img.size
    scale = min(box_w / iw, box_h / ih)
    return img.resize((max(1, int(iw * scale)), max(1, int(ih * scale))), Image.LANCZOS)


def draw_letter_M(canvas: Image.Image, font_path: str, target_h: int, fill: tuple) -> None:
    """Center an 'M' on the canvas at roughly target_h pixels tall."""
    cw, ch = canvas.size
    draw = ImageDraw.Draw(canvas)
    # Binary search for font size that gives the desired glyph height
    lo, hi = 50, 1200
    best = 100
    while lo <= hi:
        mid = (lo + hi) // 2
        f = ImageFont.truetype(font_path, mid)
        bbox = f.getbbox("M")
        h = bbox[3] - bbox[1]
        if h < target_h:
            best = mid
            lo = mid + 1
        else:
            hi = mid - 1
    font = ImageFont.truetype(font_path, best)
    bbox = font.getbbox("M")
    gw = bbox[2] - bbox[0]
    gh = bbox[3] - bbox[1]
    x = (cw - gw) // 2 - bbox[0]
    y = (ch - gh) // 2 - bbox[1]
    draw.text((x, y), "M", font=font, fill=fill)


def paste_centered(bg: Image.Image, fg: Image.Image, y_bias: float = 0.0) -> None:
    bw, bh = bg.size
    fw, fh = fg.size
    x = (bw - fw) // 2
    y = (bh - fh) // 2 + int(bh * y_bias)
    bg.paste(fg, (x, y), fg)


# -----------------------------------------------------------------
# V1 — Bold sans-serif M, orange car ghosted at ~20% behind, centered
# -----------------------------------------------------------------
def build_v1() -> Image.Image:
    canvas = Image.new("RGBA", (SIZE, SIZE), WHITE)
    car = set_opacity(CAR, 0.22)  # ~56/255
    car_fit = fit_to_box(car, int(SIZE * 0.78), int(SIZE * 0.78))
    paste_centered(canvas, car_fit)
    draw_letter_M(canvas, str(FONTS / "arialbd.ttf"), int(SIZE * 0.68), NAVY)
    return canvas


# -----------------------------------------------------------------
# V2 — Serif (Georgia Bold) M, gray car tucked into lower-third behind
# -----------------------------------------------------------------
def build_v2() -> Image.Image:
    canvas = Image.new("RGBA", (SIZE, SIZE), WHITE)
    gray_car = recolor(CAR, (140, 140, 140))
    gray_car = set_opacity(gray_car, 0.55)
    car_fit = fit_to_box(gray_car, int(SIZE * 0.52), int(SIZE * 0.52))
    # tuck lower-third
    cw, ch = canvas.size
    fw, fh = car_fit.size
    x = (cw - fw) // 2
    y = int(ch * 0.55)
    canvas.paste(car_fit, (x, y), car_fit)
    draw_letter_M(canvas, str(FONTS / "georgiab.ttf"), int(SIZE * 0.58), NAVY)
    return canvas


# -----------------------------------------------------------------
# V3 — Geometric M built from rectangles, faint orange car outline behind
# -----------------------------------------------------------------
def build_v3() -> Image.Image:
    canvas = Image.new("RGBA", (SIZE, SIZE), OFFWHITE)
    outline = car_outline(CAR, ORANGE, thickness=8)
    outline = set_opacity(outline, 0.55)
    outline_fit = fit_to_box(outline, int(SIZE * 0.82), int(SIZE * 0.82))
    paste_centered(canvas, outline_fit)

    # Geometric M from primitives — 4 bars forming the M
    draw = ImageDraw.Draw(canvas)
    pad = int(SIZE * 0.18)
    top = pad
    bottom = SIZE - pad
    left = pad
    right = SIZE - pad
    bar_w = int(SIZE * 0.14)
    # Left vertical
    draw.rectangle([left, top, left + bar_w, bottom], fill=NAVY)
    # Right vertical
    draw.rectangle([right - bar_w, top, right, bottom], fill=NAVY)
    # Two diagonals meeting in the middle — drawn as filled polygons
    mid_x = SIZE // 2
    mid_y = int(SIZE * 0.62)  # V-tip dips below center for that monogram feel
    # Left diagonal: from top of left vertical down to mid
    draw.polygon([
        (left, top),
        (left + bar_w, top),
        (mid_x + bar_w // 2, mid_y),
        (mid_x - bar_w // 2, mid_y),
    ], fill=NAVY)
    # Right diagonal: from top of right vertical down to mid
    draw.polygon([
        (right - bar_w, top),
        (right, top),
        (mid_x + bar_w // 2, mid_y),
        (mid_x - bar_w // 2, mid_y),
    ], fill=NAVY)
    return canvas


def write_pair(img: Image.Image, name: str) -> None:
    big = img.convert("RGB")
    big_path = MOCK_DIR / f"{name}.png"
    big.save(big_path, format="PNG", optimize=True)
    small = big.resize((32, 32), Image.LANCZOS)
    small_path = MOCK_DIR / f"{name}-32.png"
    small.save(small_path, format="PNG", optimize=True)
    print(f"wrote {big_path}")
    print(f"wrote {small_path}")


def main() -> None:
    write_pair(build_v1(), "favicon-v1-bold")
    write_pair(build_v2(), "favicon-v2-serif")
    write_pair(build_v3(), "favicon-v3-geometric")


if __name__ == "__main__":
    main()
