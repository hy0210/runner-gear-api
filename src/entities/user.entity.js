const { EntitySchema } = require('typeorm');

const USER_ROLES = Object.freeze({ MEMBER: 'member', ADMIN: 'admin' });

const User = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: { type: 'integer', primary: true, generated: 'increment', primaryKeyConstraintName: 'pk_users' },
    email: { type: 'varchar', length: 255, nullable: false },
    // 只存 bcrypt 雜湊；select: false 讓一般查詢不會帶出這個欄位
    password: { type: 'varchar', length: 255, nullable: false, select: false },
    name: { type: 'varchar', length: 50, nullable: false },
    role: { type: 'varchar', length: 10, nullable: false, default: USER_ROLES.MEMBER },
    createdAt: { name: 'created_at', type: 'timestamptz', createDate: true },
    updatedAt: { name: 'updated_at', type: 'timestamptz', updateDate: true },
  },
  uniques: [{ name: 'uq_users_email', columns: ['email'] }],
  checks: [{ name: 'ck_users_role', expression: `"role" IN ('member', 'admin')` }],
  relations: {
    cartItems: { type: 'one-to-many', target: 'CartItem', inverseSide: 'user' },
  },
});

module.exports = { User, USER_ROLES };
