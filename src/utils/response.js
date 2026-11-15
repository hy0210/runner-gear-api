// 統一的回應格式：
//   成功        { status: 'success', data }
//   使用者端錯誤 { status: 'failed', message, errors? }   （4xx）
//   伺服器錯誤   { status: 'error', message }             （5xx）
function sendSuccess(res, data = null, statusCode = 200) {
  return res.status(statusCode).json({ status: 'success', data });
}

function sendFailed(res, statusCode, message, errors) {
  const body = { status: 'failed', message };
  if (errors) {
    body.errors = errors;
  }
  return res.status(statusCode).json(body);
}

function sendError(res, message = '伺服器發生錯誤，請稍後再試') {
  return res.status(500).json({ status: 'error', message });
}

module.exports = { sendSuccess, sendFailed, sendError };
