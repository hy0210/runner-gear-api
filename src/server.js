const env = require('./config/env');
const dataSource = require('./config/data-source');
const app = require('./app');

async function start() {
  await dataSource.initialize();
  app.listen(env.PORT, () => {
    console.log(`API 已啟動，監聽埠 ${env.PORT}`);
  });
}

start().catch((error) => {
  // 只印出訊息，避免把連線設定帶進記錄
  console.error(`啟動失敗：${error.message}`);
  process.exit(1);
});
