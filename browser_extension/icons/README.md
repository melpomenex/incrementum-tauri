# Browser Extension Icons

This directory should contain the following icon files for the Incrementum Browser Sync extension:

- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon32.png` - 32x32 pixels (Windows taskbar)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Creating Icons

You can create these icons using any image editor. The icons should:

1. **Use the Incrementum brand colors**: 
   - Primary: #667eea (blue-purple gradient start)
   - Secondary: #764ba2 (blue-purple gradient end)

2. **Feature a simple, recognizable symbol**:
   - Letter "I" for Incrementum
   - Book or document icon
   - Sync/arrow symbol
   - Brain or knowledge symbol

3. **Be clear at small sizes**:
   - Use bold, simple shapes
   - Avoid fine details that won't be visible at 16x16
   - Ensure good contrast

## Quick Icon Generation

For testing purposes, you can create simple placeholder icons:

### Using ImageMagick (if installed):
```bash
# Create a simple gradient icon with "I"
convert -size 128x128 gradient:#667eea-#764ba2 \
        -gravity center -pointsize 80 -fill white \
        -annotate +0+0 "I" icon128.png

# Resize for other sizes
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 32x32 icon32.png
convert icon128.png -resize 16x16 icon16.png
```

### Using Online Tools:
1. Visit [Favicon.io](https://favicon.io/favicon-generator/)
2. Use text "I" with background color #667eea
3. Download and rename the generated files

### Using Design Software:
1. Create a 128x128 canvas
2. Add a gradient background (#667eea to #764ba2)
3. Add a white "I" or book icon in the center
4. Export as PNG
5. Create smaller versions by resizing

## Temporary Solution

If you don't have icons ready, you can temporarily use any 16x16, 32x32, 48x48, and 128x128 PNG files with the correct names. The extension will still work, just with placeholder icons. 