require('reflect-metadata');
const path = require('node:path');
const { DataSource } = require('typeorm');
const env = require('./env');
const { entities } = require('../entities');

const dataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  entities,
  migrations: [path.join(__dirname, '..', 'migrations', '*.js')],
  // 結構一律由 migration 管理，任何環境都不自動同步
  synchronize: false,
  migrationsRun: false,
  logging: false,
});

module.exports = dataSource;
