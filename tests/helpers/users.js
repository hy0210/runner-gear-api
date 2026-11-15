const { dataSource } = require('./db');
const { User } = require('../../src/entities');
const { signToken } = require('../../src/utils/jwt');
const { hashPassword } = require('../../src/utils/password');

// 直接在資料庫建立會員並簽發 Token（不經過註冊 API，可指定角色）。
async function createUserWithToken({ email = 'member@example.com', name = '測試會員', role = 'member', password = 'password123' } = {}) {
  const user = await dataSource.getRepository(User).save({
    email,
    name,
    role,
    password: await hashPassword(password),
  });
  return { user, token: signToken(user.id), password };
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { createUserWithToken, bearer };
