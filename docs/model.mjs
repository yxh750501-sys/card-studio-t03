export const RATIOS = Object.freeze({ square: [1080, 1080], portrait: [1080, 1350], story: [1080, 1920] });
export const DEFAULT_CONFIG = Object.freeze({ text: '오늘의 작은 순간을 크게.', x: 50, y: 78, fontSize: 72, color: '#ffffff', align: 'center', ratio: 'square' });
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_JSON_BYTES = 30 * 1024 * 1024;

export function fileKind(bytes) {
  if (bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n)) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  return null;
}

export function validateConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('설정 형식이 올바르지 않습니다.');
  const { text, x, y, fontSize, color, align, ratio } = value;
  if (typeof text !== 'string' || text.length > 500) throw Error('문구는 500자 이하여야 합니다.');
  if (![x,y].every(n => Number.isFinite(n) && n >= 8 && n <= 92)) throw Error('문구 위치가 범위를 벗어났습니다.');
  if (!Number.isInteger(fontSize) || fontSize < 24 || fontSize > 144) throw Error('글자 크기가 올바르지 않습니다.');
  if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) throw Error('글자 색이 올바르지 않습니다.');
  if (!['left','center','right'].includes(align)) throw Error('정렬 값이 올바르지 않습니다.');
  if (!Object.hasOwn(RATIOS, ratio)) throw Error('화면 비율이 올바르지 않습니다.');
  return { text, x, y, fontSize, color, align, ratio };
}

export function validateTemplate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('템플릿 항목이 올바르지 않습니다.');
  if (typeof value.id !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(value.id)) throw Error('템플릿 ID가 올바르지 않습니다.');
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 60) throw Error('템플릿 이름은 1~60자여야 합니다.');
  if (!Number.isFinite(value.updatedAt) || value.updatedAt < 0) throw Error('템플릿 날짜가 올바르지 않습니다.');
  const config = validateConfig(value.config);
  if (value.imageDataUrl !== null && (typeof value.imageDataUrl !== 'string' || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(value.imageDataUrl))) throw Error('템플릿 이미지 형식이 올바르지 않습니다.');
  return { id: value.id, name: value.name.trim(), updatedAt: value.updatedAt, config, imageDataUrl: value.imageDataUrl };
}

export function validateImport(data) {
  if (!data || typeof data !== 'object' || data.version !== 1 || !Array.isArray(data.templates) || data.templates.length > 50) throw Error('JSON 버전 또는 템플릿 목록이 올바르지 않습니다.');
  const templates = data.templates.map(validateTemplate);
  if (new Set(templates.map(t => t.id)).size !== templates.length) throw Error('중복된 템플릿 ID가 있습니다.');
  return templates;
}

export function splitGraphemes(text) {
  if (typeof Intl.Segmenter === 'function') return [...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(text)].map(x => x.segment);
  return Array.from(text);
}

export function wrapText(text, maxWidth, measure) {
  const lines = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = '';
    for (const part of splitGraphemes(paragraph)) {
      if (line && measure(line + part) > maxWidth) { lines.push(line); line = part; }
      else line += part;
    }
    lines.push(line);
  }
  return lines;
}

export function fitText(text, fontSize, width, height, measureAt) {
  if (!text) return { lines: [], size: fontSize, lineHeight: fontSize * 1.3, fits: true };
  const maxWidth = width * .84;
  const maxHeight = height * .84;
  for (let size = fontSize; size >= 16; size -= 2) {
    const lines = wrapText(text, maxWidth, line => measureAt(line, size));
    const lineHeight = size * 1.3;
    if (lines.length * lineHeight <= maxHeight && lines.every(line => measureAt(line, size) <= maxWidth)) return { lines, size, lineHeight, fits: true };
  }
  return { lines: wrapText(text, maxWidth, line => measureAt(line, 16)), size: 16, lineHeight: 20.8, fits: false };
}
