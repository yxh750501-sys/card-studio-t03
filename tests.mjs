import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_CONFIG, RATIOS, fileKind, fitText, splitGraphemes, validateConfig, validateImport, wrapText } from './docs/model.mjs';

const measure = (line, size) => splitGraphemes(line).length * size;
const cases = [
  ['긴 한글', () => assert.equal(fitText('가'.repeat(280), 100, 1080, 1920, measure).fits, true)],
  ['한글·영문 혼합', () => assert.ok(wrapText('한글 ABC card', 70, s => s.length * 10).length > 1)],
  ['명시적 줄바꿈', () => assert.deepEqual(wrapText('첫 줄\n둘째 줄', 1000, s => s.length), ['첫 줄', '둘째 줄'])],
  ['이모지 조합', () => assert.deepEqual(splitGraphemes('👩‍💻'), ['👩‍💻'])],
  ['빈 문구', () => assert.deepEqual(fitText('', 72, 1080, 1080, measure).lines, [])],
  ['1:1 비율', () => assert.deepEqual(RATIOS.square, [1080,1080])],
  ['4:5 세로 비율', () => assert.deepEqual(RATIOS.portrait, [1080,1350])],
  ['9:16 긴 세로 비율', () => assert.deepEqual(RATIOS.story, [1080,1920])],
  ['가로 JPEG', () => assert.equal(fileKind(readFileSync('fixtures/landscape.jpg').subarray(0,16)), 'image/jpeg')],
  ['투명 PNG', () => assert.equal(fileKind(readFileSync('fixtures/transparent.png').subarray(0,16)), 'image/png')],
  ['지원하지 않는 파일', () => { assert.equal(fileKind(new TextEncoder().encode('<svg>')), null); assert.equal(validateConfig(DEFAULT_CONFIG).text, DEFAULT_CONFIG.text); }],
  ['손상·필수 누락 JSON', () => {
    assert.throws(() => JSON.parse(readFileSync('fixtures/templates-malformed.json', 'utf8')));
    assert.throws(() => validateImport(JSON.parse(readFileSync('fixtures/templates-missing.json', 'utf8'))));
    assert.equal(validateImport(JSON.parse(readFileSync('fixtures/templates-valid.json', 'utf8'))).length, 3);
  }]
];
for (const [name, run] of cases) { run(); console.log(`PASS ${name}`); }
const before = Array.from('👩‍💻');
assert.ok(before.length > 1);
assert.equal(splitGraphemes('👩‍💻').length, 1);
console.log('REGRESSION 이모지 조합: 이전 코드포인트 분할 FAIL → 현재 그래핌 분할 PASS');
console.log(`${cases.length} extreme cases passed`);
