const jwt = require('jsonwebtoken');
const env = require('../config/env');

const ALGORITHM = 'HS256';

// Token 只放會員 id（sub）。角色等資料一律在驗證時從資料庫讀取，不信任 Token 內容。
function signToken(userId) {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: String(userId),
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: ALGORITHM,
  });
}

// 驗證失敗（格式錯誤、簽章錯誤、過期）時會拋出錯誤。
function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
}

module.exports = { signToken, verifyToken };
