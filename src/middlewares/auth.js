const dataSource = require('../config/data-source');
const { User, USER_ROLES } = require('../entities');
const AppError = require('../utils/app-error');
const asyncHandler = require('../utils/async-handler');
const { verifyToken } = require('../utils/jwt');
const { toPublicUser } = require('../utils/user-view');

// 會員 id 只接受純數字（不接受 1e0、0x1、前後空白等寫法）
const USER_ID_PATTERN = /^[1-9]\d{0,15}$/;
const BEARER_PATTERN = /^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/;

// 所有驗證失敗都回同一句話，不透露是缺少、格式錯誤、過期還是會員不存在
function unauthorized() {
  return new AppError(401, '請先登入');
}

// 驗證 Authorization: Bearer <JWT>，通過後把會員資料放在 req.user。
// 會員資料（含角色）每次都從資料庫讀取，不信任 Token 內的其他內容。
const auth = asyncHandler(async (req, _res, next) => {
  const match = BEARER_PATTERN.exec(req.get('authorization') ?? '');
  if (!match) {
    throw unauthorized();
  }

  let payload;
  try {
    payload = verifyToken(match[1]);
  } catch {
    throw unauthorized();
  }

  if (typeof payload.sub !== 'string' || !USER_ID_PATTERN.test(payload.sub)) {
    throw unauthorized();
  }
  const userId = Number(payload.sub);

  const user = await dataSource.getRepository(User).findOneBy({ id: userId });
  if (!user) {
    throw unauthorized();
  }

  req.user = toPublicUser(user);
  return next();
});

// 必須接在 auth 之後使用。
function requireAdmin(req, _res, next) {
  if (!req.user) {
    return next(unauthorized());
  }
  if (req.user.role !== USER_ROLES.ADMIN) {
    return next(new AppError(403, '沒有權限執行這個操作'));
  }
  return next();
}

module.exports = { auth, requireAdmin };
