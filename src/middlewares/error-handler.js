const env = require('../config/env');
const AppError = require('../utils/app-error');
const { sendFailed, sendError } = require('../utils/response');

function notFound(_req, res) {
  return sendFailed(res, 404, '找不到這個路徑');
}

// 集中處理所有錯誤。回應只包含給使用者看的訊息，
// 不帶 stack trace、SQL 或檔案路徑；細節只寫進伺服器記錄。
// （Express 以四個參數辨識錯誤處理 middleware，第四個參數不可省略。）
function errorHandler(err, _req, res, next) {
  // 回應已經開始送出時無法再改寫，交給 Express 預設處理（中斷連線）
  if (res.headersSent) {
    return next(err);
  }

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

  // body-parser 等 middleware 回報的其他 4xx（例如不支援的編碼）：固定訊息，不轉述原始錯誤
  if (err && Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
    return sendFailed(res, err.status, '請求格式不被接受');
  }

  if (env.NODE_ENV !== 'test') {
    // 只記錄名稱、代碼與 stack。不印整個錯誤物件：
    // 資料庫錯誤會附帶 SQL 與參數（可能含 email、密碼雜湊）。
    console.error(`[未預期錯誤] ${err?.name ?? 'Error'}${err?.code ? ` (${err.code})` : ''}\n${err?.stack ?? ''}`);
  }
  return sendError(res);
}

module.exports = { notFound, errorHandler };
