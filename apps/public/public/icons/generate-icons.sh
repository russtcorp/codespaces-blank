#!/bin/bash
# Icon generation script - converts SVG to PNG with required sizes and variants
# Requires ImageMagick (install with: sudo apt-get install imagemagick)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SVG_192="${SCRIPT_DIR}/icon-192.svg"
SVG_512="${SCRIPT_DIR}/icon-512.svg"

echo "Generating PNG icons from SVG sources..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is not installed. Installing..."
    sudo apt-get update
    sudo apt-get install -y imagemagick
fi

# Generate standard icons (16, 32, 192, 512)
echo "Generating standard icons..."
convert -density 300 -background none "$SVG_192" -resize 16x16 "${SCRIPT_DIR}/icon-16.png"
echo "✓ icon-16.png"

convert -density 300 -background none "$SVG_192" -resize 32x32 "${SCRIPT_DIR}/icon-32.png"
echo "✓ icon-32.png"

convert -density 300 -background none "$SVG_192" -resize 192x192 "${SCRIPT_DIR}/icon-192.png"
echo "✓ icon-192.png"

convert -density 300 -background none "$SVG_512" -resize 512x512 "${SCRIPT_DIR}/icon-512.png"
echo "✓ icon-512.png"

# Generate maskable icons (add 20% padding safe zone)
# For maskable icons, we create a version with padding to ensure the icon fits within the safe zone
echo "Generating maskable icons (with safe zone padding)..."

# Create 192x192 maskable with padding (icon in center 80%, 20% padding)
convert -density 300 -background none "$SVG_192" \
  -resize 154x154 \
  -gravity center -extent 192x192 -background white \
  "${SCRIPT_DIR}/icon-maskable-192.png"
echo "✓ icon-maskable-192.png"

# Create 512x512 maskable with padding
convert -density 300 -background none "$SVG_512" \
  -resize 409x409 \
  -gravity center -extent 512x512 -background white \
  "${SCRIPT_DIR}/icon-maskable-512.png"
echo "✓ icon-maskable-512.png"

echo ""
echo "✅ Icon generation complete!"
echo "Generated files:"
ls -lh "${SCRIPT_DIR}"/icon-*.png 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
echo ""
echo "Note: Remove the .svg files if you want to use only PNG icons:"
echo "  rm ${SCRIPT_DIR}/icon-192.svg ${SCRIPT_DIR}/icon-512.svg"
