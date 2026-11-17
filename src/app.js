const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const { buildCorsOptions } = require('./config/cors');
const { createApiRateLimiter } = require('./middlewares/rate-limit');
const healthRoutes = require('./routes/health.routes');
const createApiRoutes = require('./routes');
const docsRoutes = require('./routes/docs.routes');
const { notFound, errorHandler } = require('./middlewares/error-handler');

const JSON_BODY_LIMIT = '100kb';

// 參數只供測試使用，正式啟動時不傳：
//   extraRoutes       掛上驗證共用機制用的測試路由
//   authRateLimitMax   調整註冊次數／登入失敗次數的上限
//   loginRateLimitMax  調整登入總次數的上限
//   apiRateLimitMax    調整 /api/v1 全站請求的上限
function createApp({ extraRoutes, authRateLimitMax, loginRateLimitMax, apiRateLimitMax } = {}) {
  const app = express();

  app.disable('x-powered-by');
  // 在 CloudFront 後方時，以轉送標頭中的位址作為用戶端位址（限流用）
  app.set('trust proxy', env.TRUST_PROXY);
  app.use(helmet());
  app.use(cors(buildCorsOptions(env.CORS_ORIGINS)));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use('/health', healthRoutes);
  app.use('/api-docs', docsRoutes);
  // 全站限流只套用在 /api/v1；/health 與 /api-docs 不計入
  app.use(
    '/api/v1',
    createApiRateLimiter(apiRateLimitMax),
    createApiRoutes({ authRateLimitMax, loginRateLimitMax }),
  );

  if (extraRoutes) {
    extraRoutes(app);
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
