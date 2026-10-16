import { DEFAULT_CONFIG, MAX_IMAGE_BYTES, MAX_JSON_BYTES, RATIOS, fileKind, validateConfig, validateImport } from './model.mjs';
import { renderCard } from './render.mjs';
import { listTemplates, putTemplate, deleteTemplate, replaceTemplates } from './db.mjs';

const $ = id => document.getElementById(id);
const canvas = $('preview');
let config = { ...DEFAULT_CONFIG };
let image = null;
let imageDataUrl = null;
let selectedId = null;
let templates = [];
let lastRender = null;

function announce(message, error = false) {
  $('message').textContent = message;
  $('message').classList.toggle('error', error);
}

function draw() {
  lastRender = renderCard(canvas, config, image);
  $('dimensions').textContent = `${lastRender.width} × ${lastRender.height}`;
  $('char-count').textContent = `${config.text.length} / 500`;
  $('x-value').textContent = `${config.x}%`;
  $('y-value').textContent = `${config.y}%`;
  $('size-value').textContent = `${config.fontSize}px`;
  $('preview-message').textContent = lastRender.fits
    ? '미리보기와 내려받는 PNG는 같은 캔버스를 사용합니다.'
    : '문구가 너무 길어 다 보이지 않습니다. 글을 줄여 주세요. 현재 작업은 유지됩니다.';
  $('download').disabled = !lastRender.fits;
}

function syncControls() {
  $('caption').value = config.text;
  $('pos-x').value = config.x;
  $('pos-y').value = config.y;
  $('font-size').value = config.fontSize;
  $('text-color').value = config.color;
  $('align').value = config.align;
  for (const button of document.querySelectorAll('[data-ratio]')) {
    const selected = button.dataset.ratio === config.ratio;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  draw();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

async function inspectImage(blob) {
  if (blob.size > MAX_IMAGE_BYTES || blob.size === 0) throw Error('이미지는 8 MB 이하의 PNG 또는 JPEG여야 합니다.');
  const header = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  const kind = fileKind(header);
  if (!kind) throw Error('지원하지 않는 파일입니다. PNG 또는 JPEG 이미지를 선택하세요.');
  if (blob.type && blob.type !== kind && blob.type !== 'application/octet-stream') throw Error('파일 내용과 표시된 이미지 형식이 다릅니다.');
  let bitmap;
  try { bitmap = await createImageBitmap(blob); }
  catch { throw Error('이미지 내용을 읽을 수 없습니다. 다른 PNG 또는 JPEG를 선택하세요.'); }
  if (!bitmap.width || !bitmap.height || bitmap.width > 12000 || bitmap.height > 12000 || bitmap.width * bitmap.height > 60_000_000) {
    bitmap.close();
    throw Error('이미지 크기가 너무 큽니다. 다른 이미지를 선택하세요.');
  }
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const clean = document.createElement('canvas');
  clean.width = Math.max(1, Math.round(bitmap.width * scale));
  clean.height = Math.max(1, Math.round(bitmap.height * scale));
  clean.getContext('2d').drawImage(bitmap, 0, 0, clean.width, clean.height);
  bitmap.close();
  const url = clean.toDataURL(kind, kind === 'image/jpeg' ? .9 : undefined);
  return { url, bitmap: await createImageBitmap(await (await fetch(url)).blob()) };
}

async function bitmapFromDataUrl(url) {
  if (url === null) return null;
  const blob = await (await fetch(url)).blob();
  return inspectImage(blob);
}

async function refreshTemplates() {
  templates = await listTemplates();
  const list = $('template-list');
  list.replaceChildren();
  if (!templates.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = '아직 저장한 템플릿이 없습니다. 첫 카드를 저장해 보세요.';
    list.append(empty);
    return;
  }
  for (const template of templates) {
    const card = document.createElement('div');
    card.className = `template-card${template.id === selectedId ? ' active' : ''}`;
    const title = document.createElement('strong'); title.textContent = template.name;
    const meta = document.createElement('small'); meta.textContent = `${template.config.ratio === 'square' ? '1:1' : template.config.ratio === 'portrait' ? '4:5' : '9:16'} · ${new Date(template.updatedAt).toLocaleDateString('ko-KR')}`;
    const actions = document.createElement('div'); actions.className = 'template-actions';
    for (const [label, handler] of [
      ['불러오기', () => loadTemplate(template)],
      ['수정', () => updateTemplate(template)],
      ['삭제', () => removeTemplate(template)]
    ]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.addEventListener('click', handler); actions.append(button);
    }
    card.append(title, meta, actions); list.append(card);
  }
}

async function loadTemplate(template) {
  try {
    const nextConfig = validateConfig(template.config);
    const clean = await bitmapFromDataUrl(template.imageDataUrl);
    if (image) image.close();
    image = clean?.bitmap ?? null;
    imageDataUrl = clean?.url ?? null;
    config = nextConfig;
    selectedId = template.id;
    $('template-name').value = template.name;
    $('image-name').textContent = image ? '템플릿 이미지 사용 중' : '기본 배경 사용 중';
    syncControls(); await refreshTemplates();
    announce(`「${template.name}」 템플릿을 불러왔습니다.`);
  } catch (error) { announce(`템플릿을 불러올 수 없습니다: ${error.message}`, true); }
}

async function saveTemplate() {
  const name = $('template-name').value.trim();
  if (!name) { announce('템플릿 이름을 입력하세요.', true); return; }
  try {
    await putTemplate({ id: crypto.randomUUID(), name, updatedAt: Date.now(), config: validateConfig(config), imageDataUrl });
    selectedId = null;
    await refreshTemplates();
    announce(`「${name}」 템플릿을 새로 저장했습니다.`);
  } catch (error) { announce(`템플릿 저장 실패: ${error.message}`, true); }
}

async function updateTemplate(template) {
  const name = $('template-name').value.trim() || template.name;
  try {
    await putTemplate({ id: template.id, name, updatedAt: Date.now(), config: validateConfig(config), imageDataUrl });
    selectedId = template.id;
    await refreshTemplates();
    announce(`「${name}」 템플릿을 수정했습니다.`);
  } catch (error) { announce(`템플릿 수정 실패: ${error.message}`, true); }
}

async function removeTemplate(template) {
  if (!confirm(`「${template.name}」 템플릿을 삭제할까요?`)) return;
  try {
    await deleteTemplate(template.id);
    if (selectedId === template.id) selectedId = null;
    await refreshTemplates();
    announce(`「${template.name}」 템플릿을 삭제했습니다.`);
  } catch (error) { announce(`템플릿 삭제 실패: ${error.message}`, true); }
}

for (const [id, key, convert] of [
  ['caption','text',String],['pos-x','x',Number],['pos-y','y',Number],['font-size','fontSize',Number],['text-color','color',String],['align','align',String]
]) $(id).addEventListener('input', event => { config = { ...config, [key]: convert(event.target.value) }; draw(); });
for (const button of document.querySelectorAll('[data-ratio]')) button.addEventListener('click', () => { config = { ...config, ratio: button.dataset.ratio }; syncControls(); });

$('image-input').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  try {
    const clean = await inspectImage(file);
    if (image) image.close();
    image = clean.bitmap;
    imageDataUrl = clean.url;
    $('image-name').textContent = file.name;
    draw();
    announce('이미지를 불러왔습니다. 메타데이터가 제거된 사본으로 편집합니다.');
  } catch (error) { announce(error.message, true); }
});
$('remove-image').addEventListener('click', () => { if (image) image.close(); image = null; imageDataUrl = null; $('image-name').textContent = '기본 배경 사용 중'; draw(); announce('기본 배경으로 바꿨습니다.'); });
$('download').addEventListener('click', async () => {
  await document.fonts.ready;
  if (!renderCard(canvas, config, image).fits) { announce('문구가 너무 길어 내려받을 수 없습니다. 글을 줄여 주세요.', true); return; }
  canvas.toBlob(blob => {
    if (!blob) { announce('PNG 생성에 실패했습니다.', true); return; }
    downloadBlob(blob, `card-${config.ratio}-${Date.now()}.png`);
    announce('미리보기와 같은 PNG를 내려받았습니다.');
  }, 'image/png');
});
$('save-template').addEventListener('click', saveTemplate);
$('export-json').addEventListener('click', async () => {
  try {
    const data = { version: 1, templates: await listTemplates() };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'card-studio-templates.json');
    announce(`${data.templates.length}개 템플릿의 JSON을 내려받았습니다.`);
  } catch (error) { announce(`JSON 내보내기 실패: ${error.message}`, true); }
});
$('import-json').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  event.target.disabled = true;
  announce('JSON 파일을 검사하고 있습니다.');
  try {
    if (file.size > MAX_JSON_BYTES || file.size === 0) throw Error('JSON 파일은 30 MB 이하여야 합니다.');
    let parsed;
    try { parsed = JSON.parse(await file.text()); } catch { throw Error('JSON 문법이 손상되었습니다.'); }
    const values = validateImport(parsed);
    const cleaned = [];
    for (const value of values) {
      const imageResult = await bitmapFromDataUrl(value.imageDataUrl);
      if (imageResult) imageResult.bitmap.close();
      cleaned.push({ ...value, imageDataUrl: imageResult?.url ?? null });
    }
    await replaceTemplates(cleaned);
    selectedId = null;
    await refreshTemplates();
    announce(`${cleaned.length}개 템플릿을 복원했습니다. 이전 목록은 교체되었습니다.`);
  } catch (error) { announce(`JSON 가져오기 거부: ${error.message} 기존 템플릿은 유지됩니다.`, true); }
  finally { event.target.disabled = false; }
});

syncControls();
refreshTemplates().catch(error => announce(`템플릿 저장소를 사용할 수 없습니다: ${error.message}`, true));
