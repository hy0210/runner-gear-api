const env = require('../config/env');
const AppError = require('../utils/app-error');
const { sendFailed, sendError } = require('../utils/response');

function notFound(_req, res) {
  return sendFailed(res, 404, '找不到這個路徑');
}

// 集中處理所有錯誤。回應只包含給使用者看的訊息，
// 不帶 stack trace、SQL 或檔案路徑；細節只寫進伺服器記錄。
// （Express 以四個參數辨識錯誤處理 middleware，_next 不可省略。）
function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return sendFailed(res, err.statusCode, err.message, err.errors);
  }

  // express.json() 解析失敗或超過大小上限
  if (err && err.type === 'entity.parse.failed') {
    return sendFailed(res, 400, '請求內容不是合法的 JSON');
  }
  if (err && err.type === 'entity.too.large') {
    return sendFailed(res, 413, '請求內容過大');
  }

  if (env.NODE_ENV !== 'test') {
    console.error(err);
  }
  return sendError(res);
}

module.exports = { notFound, errorHandler };
