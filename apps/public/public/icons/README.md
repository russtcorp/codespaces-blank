# PWA Icon Assets

This directory contains icon assets for the Progressive Web App.

## ✅ Generated Icons (Complete)

The following PNG icons have been successfully generated from the SVG sources:

- `icon-16.png` - 16x16px favicon (1.3K)
- `icon-32.png` - 32x32px favicon (2.2K)
- `icon-192.png` - 192x192px standard icon (15K)
- `icon-512.png` - 512x512px standard icon (40K)
- `icon-maskable-192.png` - 192x192px maskable icon with safe zone (13K)
- `icon-maskable-512.png` - 512x512px maskable icon with safe zone (35K)

## Source Files

- `icon-192.svg` - Source SVG for smaller sizes
- `icon-512.svg` - Source SVG for larger sizes

## Regenerating Icons

If you need to regenerate the icons (e.g., after changing the SVG design), run:

```bash
bash generate-icons.sh
```

This script requires ImageMagick to be installed. On Ubuntu/Debian:
```bash
sudo apt-get install imagemagick
```

## Icon Design Guidelines

### Standard Icons
- Use the primary brand color (#b22222 or tenant-specific)
- Include the "D" letter mark centered
- Gradient background for visual appeal
- Good contrast for visibility across all sizes

### Maskable Icons (icon-maskable-*.png)
- Same design as standard icons with 20% padding on all sides
- Icon content fits within the center 80% circle (safe zone)
- Background extends to edges (no transparency)
- Used on modern Android devices where system applies mask

## Usage

The manifest references these icons for both:
1. **PWA installation** - Desktop and mobile app launchers
2. **Favicon** - Browser tabs and bookmarks
3. **Maskable variants** - Modern Android adaptive icons

All icons are in PNG format for maximum compatibility.

