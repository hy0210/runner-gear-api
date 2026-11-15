/* eslint-disable security/detect-non-literal-regexp -- 樣式由 .env.example 的變數名稱組成 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

function listSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

const exampleVars = [...read('.env.example').matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]);

describe('#12 README 涵蓋繳交要求的全部項目', () => {
  const readme = read('README.md');

  test.each([
    ['專題主題', /跑步裝備/],
    ['技術選型', /Express/],
    ['線上網址', /API Base URL/],
    ['API 文件連結', /\/api-docs/],
    ['本機啟動', /本機啟動/],
    ['環境變數', /環境變數/],
    ['一般會員測試帳號', /一般會員/],
    ['管理員測試帳號', /管理員/],
    ['管理員產生方式', /管理員產生方式/],
    ['測試方式', /npm test/],
  ])('包含「%s」', (_label, pattern) => {
    expect(readme).toMatch(pattern);
  });

  test('只公開測試帳號，不出現密鑰或資料庫密碼的值', () => {
    expect(readme).not.toMatch(/JWT_SECRET\s*=\s*\S/);
    expect(readme).not.toMatch(/DB_PASSWORD\s*=\s*\S/);
  });
});

describe('#12 環境變數說明完整', () => {
  test('.env.example 只有變數名稱，沒有任何值', () => {
    const withValue = read('.env.example')
      .split('\n')
      .filter((line) => /^[A-Z][A-Z0-9_]*=.+/.test(line));

    expect(withValue).toEqual([]);
  });

  test('README 說明了 .env.example 的每一個變數', () => {
    const readme = read('README.md');
    const missing = exampleVars.filter((name) => !new RegExp(`\`${name}\``).test(readme));

    expect(missing).toEqual([]);
  });

  test('程式讀取的環境變數都列在 .env.example', () => {
    const source = listSourceFiles(path.join(root, 'src'))
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n');
    const fromProcessEnv = [...source.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)].map((match) => match[1]);
    const envSchema = read('src', 'config', 'env.js');
    const fromSchema = [...envSchema.matchAll(/^ {2}([A-Z][A-Z0-9_]*):/gm)].map((match) => match[1]);
    const used = [...new Set([...fromProcessEnv, ...fromSchema])];

    expect(used.filter((name) => !exampleVars.includes(name))).toEqual([]);
    expect(fromSchema.length).toBeGreaterThan(5);
  });
});
