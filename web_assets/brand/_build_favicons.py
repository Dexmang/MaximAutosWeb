"""Build the Maxim Autos favicon set from the V3 geometric master.

Source: mockups/favicon-v3-geometric.png (chosen by Jerry, May 2026).
For the very small sizes (16, 32) we re-render the design at native
resolution with thickened orange car-outline strokes so the outline
survives the downscale instead of muddying into noise.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

BRAND_DIR = Path(r"C:/Users/frost/Documents/JB/pka/businesses/maxim-autos/website/web_assets/brand")
PUB_DIR = Path(r"C:/Users/frost/Documents/JB/pka/businesses/maxim-autos/website/web_assets")
SRC_MASTER = BRAND_DIR / "mockups" / "favicon-v3-geometric.png"
LOGO_CROPPED = BRAND_DIR / "logo-cropped.png"

NAVY = (11, 55, 87, 255)          # sampled from wordmark
ORANGE = (240, 128, 16, 255)      # #f08010
OFFWHITE = (252, 250, 247, 255)   # #fcfaf7


def extract_car() -> Image.Image:
    """Pull the orange car silhouette from logo-cropped.png."""
    src = Image.open(LOGO_CROPPED).convert("RGBA")
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


def car_outline(img: Image.Image, rgb: tuple[int, int, int], thickness: int) -> Image.Image:
    """Outline = alpha mask minus eroded mask, colored with rgb."""
    mask = img.split()[3]
    shrunk = mask.filter(ImageFilter.MinFilter(thickness * 2 + 1))
    edge_px = mask.load()
    shrunk_px = shrunk.load()
    w, h = mask.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()
    for y in range(h):
        for x in range(w):
            diff = max(0, edge_px[x, y] - shrunk_px[x, y])
            if diff > 20:
                op[x, y] = (rgb[0], rgb[1], rgb[2], diff)
    return out


def set_opacity(img: Image.Image, factor: float) -> Image.Image:
    out = img.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, int(a * factor))
    return out


def fit_to_box(img: Image.Image, box_w: int, box_h: int) -> Image.Image:
    iw, ih = img.size
    scale = min(box_w / iw, box_h / ih)
    return img.resize((max(1, int(iw * scale)), max(1, int(ih * scale))), Image.LANCZOS)


def render_v3(size: int, outline_thickness: int) -> Image.Image:
    """Render the V3 geometric design natively at `size`.

    `outline_thickness` is the car-outline stroke weight in source-car
    pixels before downscaling. Larger -> thicker outline that survives
    downscale to small favicon sizes.
    """
    # Render at 2x then downscale (LANCZOS) for clean antialiasing.
    R = max(size * 2, 512)
    canvas = Image.new("RGBA", (R, R), OFFWHITE)

    car = extract_car()
    outline = car_outline(car, ORANGE, thickness=outline_thickness)
    outline = set_opacity(outline, 0.55)
    outline_fit = fit_to_box(outline, int(R * 0.82), int(R * 0.82))
    ow, oh = outline_fit.size
    canvas.paste(outline_fit, ((R - ow) // 2, (R - oh) // 2), outline_fit)

    draw = ImageDraw.Draw(canvas)
    pad = int(R * 0.18)
    top, bottom = pad, R - pad
    left, right = pad, R - pad
    bar_w = int(R * 0.14)
    mid_x = R // 2
    mid_y = int(R * 0.62)
    draw.rectangle([left, top, left + bar_w, bottom], fill=NAVY)
    draw.rectangle([right - bar_w, top, right, bottom], fill=NAVY)
    draw.polygon([
        (left, top),
        (left + bar_w, top),
        (mid_x + bar_w // 2, mid_y),
        (mid_x - bar_w // 2, mid_y),
    ], fill=NAVY)
    draw.polygon([
        (right - bar_w, top),
        (right, top),
        (mid_x + bar_w // 2, mid_y),
        (mid_x - bar_w // 2, mid_y),
    ], fill=NAVY)

    return canvas.resize((size, size), Image.LANCZOS).convert("RGB")


# Per-size outline thickness in source-car px. The design default is 8 (used
# at 512). Smaller targets need beefier outlines to survive downscale.
THICKNESS_BY_SIZE = {
    16: 16,
    32: 14,
    48: 12,
    150: 10,
    180: 10,
    192: 10,
    512: 8,
}


def main() -> None:
    # logo-512.png in brand/ — use the Jerry-approved master directly.
    master_512 = Image.open(SRC_MASTER).convert("RGB")
    master_path = BRAND_DIR / "logo-512.png"
    master_512.save(master_path, format="PNG", optimize=True)
    print(f"wrote {master_path}")

    targets = {
        "favicon-16x16.png": 16,
        "favicon-32x32.png": 32,
        "favicon-48x48.png": 48,
        "apple-touch-icon.png": 180,
        "android-chrome-192x192.png": 192,
        "android-chrome-512x512.png": 512,
        "mstile-150x150.png": 150,
    }
    rendered = {}
    for name, sz in targets.items():
        out_path = PUB_DIR / name
        thick = THICKNESS_BY_SIZE.get(sz, 8)
        img = render_v3(sz, thick)
        img.save(out_path, format="PNG", optimize=True)
        rendered[sz] = img
        print(f"wrote {out_path}  ({sz}x{sz}, outline_thickness={thick})")

    # Multi-size ICO. PIL's .save(format='ICO', sizes=[...]) downscales the
    # source image to each requested size, which would re-apply downscale to
    # our hand-tuned 16/32. Build the ICO by hand-assembling each tuned size
    # via the PIL ico encoder: we write per-size temp PNGs and embed them.
    ico_path = PUB_DIR / "favicon.ico"
    # Workaround: PIL appends the requested sizes downscaled from one source,
    # so for best fidelity we hand the 48 with sizes [16,32,48]. Our 16 and
    # 32 PNGs (referenced by <link rel="icon" sizes="...">) remain canonical.
    rendered[48].save(ico_path, format="ICO",
                      sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"wrote {ico_path}  sizes=[(16,16),(32,32),(48,48)]")


if __name__ == "__main__":
    main()
