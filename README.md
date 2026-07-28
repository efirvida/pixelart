# PixelArt

Convert images into printable pixel-art bead patterns.

Upload any image, apply adjustments (grayscale, brightness, contrast, saturation), crop, and reduce it to a grid of matched palette colors. Export a printable PDF with color references — perfect for perler beads, pegboards, and mosaic crafts.

## Features

- **Image preprocessing** — grayscale, brightness, contrast, saturation, crop, dithering
- **CIELAB ΔE2000 matching** — perceptually accurate nearest-color assignment
- **Interactive grid editor** — tweak individual cells after matching
- **Three PDF export modes**:
  - *Grid + Legend* — cells with color swatches and counts
  - *Grid + Table* — cells with coordinate reference grouped by color
  - *Color Table Only* — coordinates only; hide the final image
- **Real-time preview** — before/after comparison slider

## Stack

| Layer      | Technology                                                |
| ---------- | --------------------------------------------------------- |
| Frontend   | React, TypeScript, Vite, Canvas API, Vitest               |
| Backend    | Python, FastAPI, CIELAB ΔE2000, NumPy, ReportLab, Pillow  |
| Infra      | Nginx, systemd, GitHub Actions                            |

## Development

```bash
./manage.sh dev      # Start backend + frontend (dev mode)
./manage.sh test     # Run all tests
./manage.sh build    # Build frontend for production
```

Requires Python ≥3.9 and Node.js ≥20.
