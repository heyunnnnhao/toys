# 原版素材提取

把原版 Flash《Gold Miner》SWF 里的矢量图形导出为 `public/assets/sprites/*.svg`。只把 SWF 当数据读取，不运行其中的代码。

```bash
curl -L -o gold01.swf https://archive.org/download/gold01_202103_flash/gold01.swf
SPRITE_FRAMES="249:0,4,8,12;292:0;318:0,3,6,9;320:0,3,6,9;288:0;254:3" BG_FRAME=172 \
  node scripts/assets/swf2svg.mjs gold01.swf out/svg          # 所有 shape/sprite → SVG
node scripts/assets/sheet.mjs out/svg 204,209,214 out/sheet.png  # 可选：拼图预览（需本机 Edge）
node scripts/assets/export-assets.mjs out/svg public/assets/sprites   # 按 ASSETS 表裁剪导出
```

素材版权归原作者所有，见 `public/assets/CREDITS.md`。
