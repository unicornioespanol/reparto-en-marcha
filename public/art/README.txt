Reparto en marcha — artwork integrated on 2026-11-15

Source: the graphics pack supplied with assets.json and preview.html.
Images are used unchanged. Unused imported characters, UI icons and duplicates
were omitted from the game. Its existing courier, pedestrians, recipients,
bicycle riders and scooter riders remain drawn by src/render/drawing.ts.

facades/*.webp: 12 images, 432 x 288 physical pixels each.
Draw in 144 x 96 logical pixels (3 x 2 cells); door axis is x = 72.

sprites/car_*.png, sprites/van_*.png: 8 transparent images, 240 x 126 px.
Draw at 80 x 42 logical px, anchor (40, 20). Right-facing; mirror about the
anchor for left-moving lanes. Scale X by logical body length / 68.
Simulation collision boxes, lane speed, spacing and timing are unchanged.

tiles/*.png: 12 full-width row textures plus the gate and start markers.
Row textures: 1296 x 144 physical px, drawn at 432 x 48 logical px.
Gate: 48 x 48 logical px, anchor (24, 24).
Start: 60 x 48 logical px, anchor (30, 24).

Authoritative metadata: src/content/art.ts and src/content/catalog.ts.
All asset paths are relative and work under a GitHub Pages repository prefix.
