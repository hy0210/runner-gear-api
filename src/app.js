const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const { buildCorsOptions } = require('./config/cors');
const healthRoutes = require('./routes/health.routes');
const { notFound, errorHandler } = require('./middlewares/error-handler');

const JSON_BODY_LIMIT = '100kb';

// extraRoutes 只供測試掛上驗證共用機制的路由，正式啟動時不傳。
function createApp({ extraRoutes } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors(buildCorsOptions(env.CORS_ORIGINS)));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use('/health', healthRoutes);

  if (extraRoutes) {
    extraRoutes(app);
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
