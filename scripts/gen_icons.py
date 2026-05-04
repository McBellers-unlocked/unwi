"""Generate favicon, app icon, Apple touch icon, and OG/social images
from public/UNWI.png. Run from repo root: `python3 scripts/gen_icons.py`."""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "UNWI.png"
APP = ROOT / "src" / "app"
PUBLIC = ROOT / "public"

CREAM = (255, 241, 229)  # #FFF1E5 — site theme color
WHITE_THRESHOLD = 245  # pixels brighter than this become transparent


def load_logo_transparent() -> Image.Image:
    """Load UNWI.png and make its white background transparent."""
    img = Image.open(SRC).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r >= WHITE_THRESHOLD and g >= WHITE_THRESHOLD and b >= WHITE_THRESHOLD:
                pixels[x, y] = (r, g, b, 0)
    return img


def fit_square(size: int, bg: tuple[int, int, int] | None = None) -> Image.Image:
    img = load_logo_transparent()
    img.thumbnail((size, size), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (*bg, 255) if bg else (0, 0, 0, 0))
    x = (size - img.width) // 2
    y = (size - img.height) // 2
    canvas.paste(img, (x, y), img)
    return canvas


def social_card(width: int, height: int, padding: int = 80) -> Image.Image:
    canvas = Image.new("RGB", (width, height), CREAM)
    logo = load_logo_transparent()
    target = min(width, height) - padding * 2
    logo.thumbnail((target, target), Image.LANCZOS)
    x = (width - logo.width) // 2
    y = (height - logo.height) // 2
    canvas.paste(logo, (x, y), logo)
    return canvas


def main() -> None:
    # App router file-based icons (Next.js auto-discovers these).
    fit_square(256).save(APP / "icon.png", optimize=True)
    fit_square(180).save(APP / "apple-icon.png", optimize=True)

    og = social_card(1200, 630)
    og.save(APP / "opengraph-image.png", optimize=True)
    og.save(APP / "twitter-image.png", optimize=True)

    # Legacy favicon.ico (multi-resolution) for old browsers and tab bars.
    fit_square(64).save(
        PUBLIC / "favicon.ico",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
    )

    print("wrote:")
    for p in [
        APP / "icon.png",
        APP / "apple-icon.png",
        APP / "opengraph-image.png",
        APP / "twitter-image.png",
        PUBLIC / "favicon.ico",
    ]:
        print(f"  {p.relative_to(ROOT)}  ({p.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
