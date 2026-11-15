/* eslint-disable security/detect-object-injection, security/detect-non-literal-regexp -- 測試中的鍵與樣式都是寫死的字串 */
// 正式環境設定的檢查（src/config/env.js）。每個測試以獨立的 module 環境重新載入設定。
const ORIGINAL_ENV = { ...process.env };

const productionEnv = {
  NODE_ENV: 'production',
  // 指向不存在的檔案，確保測試不會讀到任何 .env
  DOTENV_CONFIG_PATH: '/nonexistent/.env',
  DB_HOST: 'db',
  DB_USERNAME: 'runner',
  DB_PASSWORD: 'db-password-value',
  DB_DATABASE: 'runner_gear',
  JWT_SECRET: 'j'.repeat(40),
  CORS_ORIGINS: 'https://shop.example.com',
};

function loadEnv(overrides = {}) {
  process.env = { ...productionEnv, ...overrides };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
  }
  let loaded;
  jest.isolateModules(() => {
    loaded = require('../src/config/env');
  });
  return loaded;
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('#11 正式環境設定安全', () => {
  test('設定齊全：可以載入，trust proxy 預設為 1（CloudFront 一層）', () => {
    const env = loadEnv();

    expect(env.NODE_ENV).toBe('production');
    expect(env.TRUST_PROXY).toBe(1);
    expect(env.CORS_ORIGINS).toEqual(['https://shop.example.com']);
    expect(env.JWT_EXPIRES_IN).toBe('7d');
  });

  test.each(['JWT_SECRET', 'DB_PASSWORD', 'CORS_ORIGINS'])(
    '缺少 %s：拒絕啟動並指出變數名稱',
    (name) => {
      expect(() => loadEnv({ [name]: undefined })).toThrow(new RegExp(name));
    },
  );

  test('錯誤訊息只有變數名稱與原因，不印出值', () => {
    let message = '';
    try {
      loadEnv({ JWT_SECRET: 'too-short-secret-value', CORS_ORIGINS: 'not-a-valid-origin' });
    } catch (error) {
      message = error.message;
    }

    expect(message).toMatch(/JWT_SECRET/);
    expect(message).toMatch(/CORS_ORIGINS/);
    expect(message).not.toMatch(/too-short-secret-value|not-a-valid-origin|db-password-value/);
  });

  test('.env 中留空的選填變數視為未設定，使用預設值', () => {
    const env = loadEnv({ TRUST_PROXY: '', JWT_EXPIRES_IN: '', PORT: '', DB_PORT: '' });

    expect(env.TRUST_PROXY).toBe(1);
    expect(env.JWT_EXPIRES_IN).toBe('7d');
    expect(env.PORT).toBe(3000);
    expect(env.DB_PORT).toBe(5432);
  });

  test('必填變數留空等同缺少：拒絕啟動', () => {
    expect(() => loadEnv({ JWT_SECRET: '' })).toThrow(/JWT_SECRET/);
    expect(() => loadEnv({ CORS_ORIGINS: '  ' })).toThrow(/CORS_ORIGINS/);
  });
});

describe('#11 限流在 CloudFront 後方仍依真實來源計算', () => {
  test('trust proxy 為 1 時，以轉送標頭最後一個位址作為用戶端位址，前面偽造的值無效', async () => {
    const express = require('express');
    const request = require('supertest');
    const createApp = require('../src/app');
    const app = createApp({
      extraRoutes: (instance) => instance.use('/test/ip', express.Router().get('/', (req, res) => res.json({ ip: req.ip }))),
    });

    const res = await request(app).get('/test/ip').set('X-Forwarded-For', '1.2.3.4, 203.0.113.9');

    expect(res.body.ip).toBe('203.0.113.9');
  });
});
