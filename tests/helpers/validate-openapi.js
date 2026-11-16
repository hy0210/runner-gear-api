// 以獨立的 Node 行程驗證 openapi.yaml（驗證套件是 ES Module，無法在 Jest 的 CommonJS 環境直接載入）。
// 用法：node tests/helpers/validate-openapi.js <openapi.yaml 的路徑>；驗證失敗時以非零狀態結束。
const fs = require('node:fs');
const YAML = require('yaml');
const SwaggerParser = require('@apidevtools/swagger-parser');

// eslint-disable-next-line security/detect-non-literal-fs-filename -- 路徑由測試程式傳入
const spec = YAML.parse(fs.readFileSync(process.argv[2], 'utf8'));

SwaggerParser.validate(spec)
  .then(() => console.log('OK'))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
