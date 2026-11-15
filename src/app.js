const express = require('express');
const healthRoutes = require('./routes/health.routes');

const app = express();

app.disable('x-powered-by');

app.use('/health', healthRoutes);

app.use((_req, res) => {
  res.status(404).json({ status: 'failed', message: '找不到這個路徑' });
});

module.exports = app;
