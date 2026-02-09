# Scripts

## Generate Test Images

Creates two folders of simple shape PNGs inside the default unsorted images directory (`~/Documents/ImageStore/unsorted/`):

- `test-img/` — white background, black shapes (circle, square, triangle, diamond)
- `test-inverse-img/` — black background, white shapes

### Usage

```bash
pip install Pillow
python scripts/generate_test_images.py
```

Then point ImageStore's source folder at either subfolder to practice sorting.
