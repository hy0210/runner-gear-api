const env = require('./config/env');
const app = require('./app');

app.listen(env.PORT, () => {
  console.log(`API 已啟動，監聽埠 ${env.PORT}`);
});
