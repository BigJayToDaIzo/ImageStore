#!/usr/bin/env python3
"""Generate test images for ImageStore development.

Creates two folders inside ~/Documents/ImageStore/unsorted/:
  test-img/          — white background, black shapes (normal)
  test-inverse-img/  — black background, white shapes (inverse)

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
    normal_dir = str(UNSORTED_DIR / "test-img")
    inverse_dir = str(UNSORTED_DIR / "test-inverse-img")
    os.makedirs(normal_dir, exist_ok=True)
    os.makedirs(inverse_dir, exist_ok=True)

    for name, draw_fn in SHAPES:
        # Normal: white background, black shape
        img = Image.new("RGB", (WIDTH, HEIGHT), "white")
        draw_fn(ImageDraw.Draw(img), "black")
        img.save(os.path.join(normal_dir, f"{name}.png"))

        # Inverse: black background, white shape
        img = Image.new("RGB", (WIDTH, HEIGHT), "black")
        draw_fn(ImageDraw.Draw(img), "white")
        img.save(os.path.join(inverse_dir, f"{name}.png"))

    print(f"Created {len(SHAPES)} images in {normal_dir}")
    print(f"Created {len(SHAPES)} images in {inverse_dir}")


if __name__ == "__main__":
    generate_images()
