#!/usr/bin/env python3
"""Generate test images for ImageStore development.

Creates 8 images directly in ~/Documents/ImageStore/unsorted/:
  {shape}.png         — white background, black shape (normal)
  {shape}_inverse.png — black background, white shape (inverse)

Requires: pip install Pillow
"""

import os
from pathlib import Path
from PIL import Image, ImageDraw

WIDTH, HEIGHT = 400, 400
STROKE = 8

UNSORTED_DIR = Path.home() / "Documents" / "ImageStore" / "unsorted"


def draw_hollow_circle(draw, fg):
    margin = 40
    draw.ellipse(
        [margin, margin, WIDTH - margin, HEIGHT - margin],
        outline=fg,
        width=STROKE
    )


def draw_hollow_square(draw, fg):
    margin = 60
    draw.rectangle(
        [margin, margin, WIDTH - margin, HEIGHT - margin],
        outline=fg,
        width=STROKE
    )


def draw_hollow_triangle(draw, fg):
    margin = 50
    points = [
        (WIDTH // 2, margin),
        (margin, HEIGHT - margin),
        (WIDTH - margin, HEIGHT - margin),
    ]
    draw.polygon(points, outline=fg, width=STROKE)


def draw_hollow_diamond(draw, fg):
    margin = 50
    cx, cy = WIDTH // 2, HEIGHT // 2
    points = [
        (cx, margin),
        (WIDTH - margin, cy),
        (cx, HEIGHT - margin),
        (margin, cy),
    ]
    draw.polygon(points, outline=fg, width=STROKE)


SHAPES = [
    ("circle", draw_hollow_circle),
    ("square", draw_hollow_square),
    ("triangle", draw_hollow_triangle),
    ("diamond", draw_hollow_diamond),
]


def generate_images():
    out_dir = str(UNSORTED_DIR)
    os.makedirs(out_dir, exist_ok=True)

    count = 0
    for name, draw_fn in SHAPES:
        # Normal: white background, black shape
        img = Image.new("RGB", (WIDTH, HEIGHT), "white")
        draw_fn(ImageDraw.Draw(img), "black")
        img.save(os.path.join(out_dir, f"{name}.png"))
        count += 1

        # Inverse: black background, white shape
        img = Image.new("RGB", (WIDTH, HEIGHT), "black")
        draw_fn(ImageDraw.Draw(img), "white")
        img.save(os.path.join(out_dir, f"{name}_inverse.png"))
        count += 1

    print(f"Created {count} images in {out_dir}")


if __name__ == "__main__":
    generate_images()
