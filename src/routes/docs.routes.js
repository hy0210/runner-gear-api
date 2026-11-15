const fs = require('node:fs');
const path = require('node:path');
const { Router } = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');

// API 文件的單一來源是專案根目錄的 openapi.yaml，啟動時讀取一次
const SPEC_PATH = path.join(__dirname, '..', '..', 'openapi.yaml');
const spec = YAML.parse(fs.readFileSync(SPEC_PATH, 'utf8'));

const router = Router();

// 供 Postman 等工具匯入
router.get('/openapi.json', (_req, res) => res.json(spec));

// Swagger UI。頁面只載入同來源的 script，沿用全站的 helmet 設定，不需要放寬 CSP
router.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(spec, {
    customSiteTitle: 'Runner Gear API 文件',
    swaggerOptions: {
      // 重新整理後保留已填入的 token
      persistAuthorization: true,
      // 不把文件送到外部的驗證服務
      validatorUrl: null,
    },
  }),
);

module.exports = router;
