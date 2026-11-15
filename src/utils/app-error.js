// 可預期的業務錯誤（4xx）。訊息會直接回給使用者，不要放內部細節。
class AppError extends Error {
  constructor(statusCode, message, errors) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

module.exports = AppError;
