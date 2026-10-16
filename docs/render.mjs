import { RATIOS, fitText } from './model.mjs';

function cover(ctx, image, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const cropW = width / scale;
  const cropH = height / scale;
  ctx.drawImage(image, (image.width - cropW) / 2, (image.height - cropH) / 2, cropW, cropH, 0, 0, width, height);
}

function defaultBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#2b554a');
  gradient.addColorStop(.48, '#153e49');
  gradient.addColorStop(1, '#0a252f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = .25;
  ctx.fillStyle = '#b2efa2';
  ctx.beginPath(); ctx.arc(width * .79, height * .25, width * .31, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a4c7d4';
  ctx.beginPath(); ctx.arc(width * .2, height * .73, width * .25, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

export function renderCard(canvas, config, image = null) {
  const [width, height] = RATIOS[config.ratio];
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.clearRect(0, 0, width, height);
  if (image) cover(ctx, image, width, height);
  else defaultBackground(ctx, width, height);

  const shade = ctx.createLinearGradient(0, height * .4, 0, height);
  shade.addColorStop(0, '#00000000');
  shade.addColorStop(1, '#0013159c');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);

  const measureAt = (line, size) => {
    ctx.font = `700 ${size}px Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
    return ctx.measureText(line).width;
  };
  const layout = fitText(config.text, config.fontSize, width, height, measureAt);
  if (!layout.fits) return { fits: false, width, height };

  ctx.font = `700 ${layout.size}px Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = config.align;
  ctx.fillStyle = config.color;
  ctx.shadowColor = '#000000b8';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  const blockHeight = layout.lines.length * layout.lineHeight;
  const centerY = Math.max(height * .08 + blockHeight / 2, Math.min(height * .92 - blockHeight / 2, height * config.y / 100));
  layout.lines.forEach((line, i) => {
    const lineWidth = ctx.measureText(line).width;
    let x = width * config.x / 100;
    if (config.align === 'center') x = Math.max(width * .08 + lineWidth / 2, Math.min(width * .92 - lineWidth / 2, x));
    if (config.align === 'left') x = Math.max(width * .08, Math.min(width * .92 - lineWidth, x));
    if (config.align === 'right') x = Math.max(width * .08 + lineWidth, Math.min(width * .92, x));
    ctx.fillText(line, x, centerY - blockHeight / 2 + (i + .5) * layout.lineHeight);
  });
  ctx.shadowColor = 'transparent';
  return { fits: true, width, height, effectiveFontSize: layout.size, lines: layout.lines.length };
}
