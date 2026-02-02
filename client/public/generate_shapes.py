#!/usr/bin/env python3
"""Generate test images with hollow shapes."""

from PIL import Image, ImageDraw

WIDTH, HEIGHT = 400, 400
STROKE = 8


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
    for name, draw_fn in SHAPES:
        # White background, black foreground
        img_light = Image.new("RGB", (WIDTH, HEIGHT), "white")
        draw_light = ImageDraw.Draw(img_light)
        draw_fn(draw_light, "black")
        img_light.save(f"{name}_light.png")

        # Black background, white foreground
        img_dark = Image.new("RGB", (WIDTH, HEIGHT), "black")
        draw_dark = ImageDraw.Draw(img_dark)
        draw_fn(draw_dark, "white")
        img_dark.save(f"{name}_dark.png")

    print("Generated 8 images:")
    for name, _ in SHAPES:
        print(f"  {name}_light.png (white bg, black shape)")
        print(f"  {name}_dark.png (black bg, white shape)")


if __name__ == "__main__":
    generate_images()
