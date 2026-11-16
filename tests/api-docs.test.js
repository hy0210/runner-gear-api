const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const YAML = require('yaml');
const { execFileSync } = require('node:child_process');
const { createTestApp } = require('./helpers/app');
const { resetDatabase, closeDatabase } = require('./helpers/db');

const app = createTestApp();
const specPath = path.join(__dirname, '..', 'openapi.yaml');
const loadSpec = () => YAML.parse(fs.readFileSync(specPath, 'utf8'));
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

// 程式中註冊的全部路由。新增或移除 API 時必須同步修改這份清單與 openapi.yaml。
const ROUTES = [
  ['get', '/health', false],
  ['post', '/api/v1/auth/register', false],
  ['post', '/api/v1/auth/login', false],
  ['get', '/api/v1/auth/me', true],
  ['get', '/api/v1/categories', false],
  ['get', '/api/v1/products', false],
  ['get', '/api/v1/products/{id}', false],
  ['post', '/api/v1/admin/products', true],
  ['patch', '/api/v1/admin/products/{id}', true],
  ['delete', '/api/v1/admin/products/{id}', true],
  ['get', '/api/v1/cart', true],
  ['post', '/api/v1/cart/items', true],
  ['patch', '/api/v1/cart/items/{itemId}', true],
  ['delete', '/api/v1/cart/items/{itemId}', true],
];

function send(method, url) {
  const agent = request(app);
  if (method === 'post') return agent.post(url);
  if (method === 'patch') return agent.patch(url);
  if (method === 'delete') return agent.delete(url);
  return agent.get(url);
}

function listOperations(spec) {
  return Object.entries(spec.paths).flatMap(([route, item]) =>
    Object.entries(item)
      .filter(([method]) => METHODS.includes(method))
      .map(([method, operation]) => ({ method, route, operation })),
  );
}

beforeAll(resetDatabase);
afterAll(closeDatabase);

describe('#10 API 文件可公開閱讀且與實作一致', () => {
  test('開啟文件：/api-docs 顯示 Swagger UI，不需登入', async () => {
    const page = await request(app).get('/api-docs/');
    const init = await request(app).get('/api-docs/swagger-ui-init.js');
    const bundle = await request(app).get('/api-docs/swagger-ui-bundle.js');

    expect(page.status).toBe(200);
    expect(page.headers['content-type']).toMatch(/text\/html/);
    expect(page.text).toMatch(/swagger-ui/);
    expect(init.status).toBe(200);
    expect(init.text).toMatch(/Runner Gear/);
    expect(bundle.status).toBe(200);
  });

  test('/api-docs 沒有結尾斜線時會導向正確的網址', async () => {
    const res = await request(app).get('/api-docs');

    expect([301, 302]).toContain(res.status);
    expect(res.headers.location).toBe('/api-docs/');
  });

  test('可下載 JSON 格式的文件（供 Postman 匯入）', async () => {
    const res = await request(app).get('/api-docs/openapi.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.paths).toEqual(loadSpec().paths);
  });

  test('文件格式正確：通過 OpenAPI 驗證', () => {
    const validator = path.join(__dirname, 'helpers', 'validate-openapi.js');

    const output = execFileSync(process.execPath, [validator, specPath], { encoding: 'utf8' });

    expect(output.trim()).toBe('OK');
  });

  test('文件涵蓋所有路由：路徑與方法和程式註冊的完全一致', () => {
    const documented = listOperations(loadSpec()).map(({ method, route }) => `${method} ${route}`);

    expect(documented.sort()).toEqual(ROUTES.map(([method, route]) => `${method} ${route}`).sort());
  });

  test('文件上的每一支 API 在程式中都真的存在', async () => {
    for (const [method, route] of ROUTES) {
      const res = await send(method, route.replace(/\{\w+\}/g, '1'));
      const notRegistered = res.status === 404 && res.body.message === '找不到這個路徑';

      expect({ route: `${method} ${route}`, notRegistered }).toEqual({ route: `${method} ${route}`, notRegistered: false });
    }
  });

  test('每一支 API 都有說明、回應與錯誤碼；有請求內容的都有 schema', () => {
    for (const { method, route, operation } of listOperations(loadSpec())) {
      const label = `${method} ${route}`;
      expect({ label, summary: typeof operation.summary }).toEqual({ label, summary: 'string' });
      expect(Object.keys(operation.responses).length).toBeGreaterThan(0);
      if (['post', 'patch'].includes(method)) {
        expect(operation.requestBody.content['application/json'].schema).toBeDefined();
      }
    }
  });
});

describe('#10 可在文件上完成授權測試', () => {
  test('需要登入的 API 標示 Bearer Token，公開的 API 不標示，且都列出對應的錯誤碼', () => {
    const spec = loadSpec();
    const operations = listOperations(spec);

    expect(spec.components.securitySchemes.bearerAuth).toMatchObject({ type: 'http', scheme: 'bearer' });
    for (const [method, route, needsAuth] of ROUTES) {
      const { operation } = operations.find((op) => op.method === method && op.route === route);
      const label = `${method} ${route}`;
      const declared = Boolean(operation.security && operation.security.some((item) => 'bearerAuth' in item));

      expect({ label, declared }).toEqual({ label, declared: needsAuth });
      if (needsAuth) {
        expect({ label, has401: '401' in operation.responses }).toEqual({ label, has401: true });
      }
      if (route.includes('/admin/')) {
        expect({ label, has403: '403' in operation.responses }).toEqual({ label, has403: true });
      }
    }
  });

  test('範例值不含真實的 Token 或看起來像密鑰的字串', () => {
    const text = fs.readFileSync(specPath, 'utf8');

    expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/);
  });
});
