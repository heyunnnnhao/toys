# Asset credits

## Sound effects (`sfx/`)

All sound effects are by **Kenney** (www.kenney.nl), licensed **CC0 1.0** (public domain dedication,
http://creativecommons.org/publicdomain/zero/1.0/). Files were renamed to the game's sound names.

| File | Pack | Original file |
| --- | --- | --- |
| drop.ogg | Interface Sounds | drop_002.ogg |
| grab.ogg | Impact Sounds | impactMetal_light_001.ogg |
| cash.ogg | Casino Audio | chips-collide-2.ogg |
| cash-big.ogg | Casino Audio | chips-stack-5.ogg |
| clunk.ogg | Impact Sounds | impactGeneric_light_002.ogg |
| bomb.ogg | Sci-Fi Sounds | explosionCrunch_000.ogg |
| explode.ogg | Sci-Fi Sounds | lowFrequency_explosion_000.ogg |
| tick.ogg | Interface Sounds | tick_002.ogg |
| powerup.ogg | Interface Sounds | confirmation_002.ogg |
| freeze.ogg | Interface Sounds | glass_002.ogg |
| saw.ogg | Sci-Fi Sounds | laserRetro_001.ogg |
| levelup.ogg | Interface Sounds | maximize_006.ogg |
| buy.ogg | Casino Audio | chips-handle-3.ogg |
| error.ogg | Interface Sounds | error_004.ogg |
| click.ogg | Interface Sounds | click_002.ogg |
| timeup.ogg | Interface Sounds | bong_001.ogg |

Pack pages: https://kenney.nl/assets/interface-sounds · https://kenney.nl/assets/impact-sounds ·
https://kenney.nl/assets/casino-audio · https://kenney.nl/assets/sci-fi-sounds

## Graphics (`sprites/`) — copyrighted, personal use only

The sprites in `sprites/` are taken from the original Flash game **Gold Miner** (2003),
© GameRival / eUniverse, Inc., All Rights Reserved. They are **not** freely licensed.

- Source: `gold01.swf` from the Internet Archive item https://archive.org/details/gold01_202103_flash
- Extracted by rendering the SWF's vector shapes / sprite frames to SVG (a small converter written for this
  project; the SWF was only read as data), then cropped. No shapes were redrawn or edited.
- Mapping: gold = sprite 204, rock = 209, rock2 = 219, bag = 214, diamond = 289, bone = 323, tnt = 331,
  pig = sprite 318 frame 0 (mirrored), diamond-pig = sprite 320 frame 0 (mirrored),
  miner / miner-pull-0..3 = sprite 249 frames 0/4/8/12, miner-cheer = 254 frame 3, claw = 292 frame 0,
  explosion = 288, bg-top = root frame 172 background layers, bg-mine-1..4 = shapes 182/309/310/322.

Use them only for private, non-commercial play / learning. **Before publishing or distributing the game,
delete `public/assets/sprites/`** (or replace the files): every sprite falls back to the built-in vector
drawings in `src/game/render/sprites.ts` when its file is missing.
