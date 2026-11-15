const bcrypt = require('bcrypt');
const env = require('../config/env');

// 測試環境降低運算成本以加快測試，其餘環境固定為 10
const SALT_ROUNDS = env.NODE_ENV === 'test' ? 4 : 10;

function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// 帳號不存在時用來比對的假雜湊，讓「帳號不存在」與「密碼錯誤」花的時間相近
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', SALT_ROUNDS);

module.exports = { hashPassword, verifyPassword, DUMMY_HASH };
