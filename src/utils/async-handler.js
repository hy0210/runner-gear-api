// 包住非同步的 controller，讓拋出的錯誤一律交給錯誤處理 middleware。
function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve()
      .then(() => handler(req, res, next))
      .catch(next);
  };
}

module.exports = asyncHandler;
