#!/usr/bin/env bash
set -euo pipefail
mkdir -p docs/examples fixtures
font=/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc

magick -size 1200x500 gradient:'#306e7a-#0c2638' -strip fixtures/landscape.jpg
magick -size 600x900 xc:none -fill '#ee746a88' -draw 'circle 300,450 530,450' -strip fixtures/transparent.png

magick -size 1080x1080 gradient:'#183d42-#071d2c' \
  -fill '#c8ed9b' -draw 'circle 800,240 1030,240' \
  -fill '#78b7ad77' -draw 'circle 180,850 430,850' \
  -font "$font" -gravity center -fill white -pointsize 88 -annotate +0+115 '오늘의 작은 승리' \
  -gravity south -fill '#d2e9d8' -pointsize 29 -annotate +0+95 'SMALL MOMENTS · BIG FEELINGS' \
  -strip docs/examples/01-square.png

magick -size 1080x1350 gradient:'#634d75-#d37d78' \
  -fill '#f8cd9a' -draw 'circle 720,380 1010,380' \
  -fill '#473253bb' -draw 'roundrectangle 105,850 980,1240 65,65' \
  -font "$font" -gravity south -fill white -pointsize 93 -annotate +0+248 '주말의 온도' \
  -fill '#ffdfc4' -pointsize 34 -annotate +0+165 '천천히, 나답게 쉬는 날' \
  -strip docs/examples/02-portrait.png

magick -size 1080x1920 gradient:'#1b334d-#07111f' \
  -fill '#70dbc1' -draw 'circle 570,550 910,550' \
  -fill '#10324d' -draw 'circle 710,500 940,500' \
  -fill '#e0edba' -draw 'circle 250,290 258,290 circle 800,1030 810,1030 circle 185,1450 194,1450' \
  -font "$font" -gravity center -fill white -pointsize 110 -annotate +0+370 '계속, 나답게' \
  -fill '#a8d8d4' -pointsize 36 -annotate +0+485 'MY OWN PACE · MY OWN PATH' \
  -strip docs/examples/03-story.png
