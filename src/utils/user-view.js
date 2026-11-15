// 回應中的會員資料一律經過這裡：明確挑選欄位，不會帶出密碼。
function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

module.exports = { toPublicUser };
