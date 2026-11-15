const dataSource = require('../config/data-source');
const { User, USER_ROLES } = require('../entities');
const AppError = require('../utils/app-error');
const { sendSuccess } = require('../utils/response');
const { signToken } = require('../utils/jwt');
const { hashPassword, verifyPassword, DUMMY_HASH } = require('../utils/password');
const { toPublicUser } = require('../utils/user-view');

const PG_UNIQUE_VIOLATION = '23505';
const LOGIN_FAILED_MESSAGE = 'email 或密碼錯誤';

function userRepository() {
  return dataSource.getRepository(User);
}

async function register(req, res) {
  const { email, password, name } = req.validated.body;

  const existing = await userRepository().findOneBy({ email });
  if (existing) {
    throw new AppError(409, '這個 email 已經註冊過');
  }

  let user;
  try {
    user = await userRepository().save({
      email,
      password: await hashPassword(password),
      name,
      // 角色由伺服器固定，不接受請求指定
      role: USER_ROLES.MEMBER,
    });
  } catch (error) {
    // 兩個請求同時註冊同一個 email 時，由資料庫的 unique 約束擋下
    if (error?.driverError?.code === PG_UNIQUE_VIOLATION) {
      throw new AppError(409, '這個 email 已經註冊過');
    }
    throw error;
  }

  return sendSuccess(res, { user: toPublicUser(user), token: signToken(user.id) }, 201);
}

async function login(req, res) {
  const { email, password } = req.validated.body;

  // password 欄位預設不會被查出來，登入時才明確選取
  const user = await userRepository()
    .createQueryBuilder('user')
    .addSelect('user.password')
    .where('user.email = :email', { email })
    .getOne();

  const passwordMatches = await verifyPassword(password, user ? user.password : DUMMY_HASH);
  if (!user || !passwordMatches) {
    // 不透露是帳號不存在還是密碼錯誤
    throw new AppError(401, LOGIN_FAILED_MESSAGE);
  }

  return sendSuccess(res, { user: toPublicUser(user), token: signToken(user.id) });
}

module.exports = { register, login };
