# Runner Gear 跑者裝備｜後端 API

六角學院單人專題：**跑步裝備店**電商平台的後端。提供會員註冊登入、商品瀏覽與管理、購物車等 API，搭配前端 [`runner-gear-web`](https://github.com/hy0210/runner-gear-web) 使用。

## 線上網址

| 項目 | 網址 |
|---|---|
| API Base URL | <https://d1461t9n4hr1h9.cloudfront.net> |
| API 文件（Swagger UI） | <https://d1461t9n4hr1h9.cloudfront.net/api-docs> |
| 前端網站 | <https://main.dw6kj6rkourn5.amplifyapp.com> |
| 前端 Repo | <https://github.com/hy0210/runner-gear-web> |

API 文件可以直接在瀏覽器試打：先呼叫登入取得 `token`，按右上角 **Authorize** 貼上即可。要匯入 Postman 可使用 <https://d1461t9n4hr1h9.cloudfront.net/api-docs/openapi.json>。

## 測試帳號

| 身分 | Email | 密碼 |
|---|---|---|
| 一般會員 | `member@runnergear.test` | `m1e2m3b4e5r6` |
| 管理員 | `admin@runnergear.test` | `a5d4m3i2n1` |

管理員測試帳號是公開的，商品資料可能被其他人改動；審核期間會定期還原為初始的 35 筆商品。

### 管理員產生方式

- 註冊 API 只接受 `email`、`password`、`name`，角色由伺服器固定為一般會員；請求中夾帶 `role` 會被忽略。
- 系統**沒有任何可以修改角色的 API**。
- 管理員只能由伺服器上的 seed 指令建立：`npm run seed:admin`（或 `npm run seed`）會讀取環境變數 `ADMIN_EMAIL`、`ADMIN_PASSWORD`、`ADMIN_NAME`，把密碼以 bcrypt 雜湊後寫入資料庫。
- 若該 email 已被一般會員註冊，seed 會中止，不會把既有帳號升級為管理員。

## 功能

| 類別 | API | 權限 |
|---|---|---|
| 會員 | `POST /api/v1/auth/register`、`POST /api/v1/auth/login`、`GET /api/v1/auth/me` | 公開；`me` 需登入 |
| 商品 | `GET /api/v1/products`（分頁、分類篩選、關鍵字搜尋）、`GET /api/v1/products/:id`、`GET /api/v1/categories` | 公開 |
| 購物車 | `GET /api/v1/cart`、`POST /api/v1/cart/items`、`PATCH`／`DELETE /api/v1/cart/items/:itemId` | 需登入，只能操作自己的購物車 |
| 商品管理 | `POST /api/v1/admin/products`、`PATCH`／`DELETE /api/v1/admin/products/:id` | 管理員 |

購物車的邊界情況：重複加入同一商品會累加數量；商品不存在回 404；數量不是正整數回 400；未登入回 401；操作他人的購物車項目回 404。

回應格式一致：成功為 `{ "status": "success", "data": ... }`，失敗為 `{ "status": "failed" | "error", "message": "..." }`。

## 技術

| 項目 | 使用 |
|---|---|
| 執行環境 | Node.js 24、Express 5（JavaScript） |
| 資料庫 | PostgreSQL 18、TypeORM（EntitySchema + migration） |
| 身分驗證 | bcrypt 密碼雜湊、JWT（有期限）、`auth` 與 `requireAdmin` middleware |
| 輸入驗證 | zod |
| 安全 | helmet、CORS 白名單、註冊與登入限流、請求大小上限 |
| API 文件 | OpenAPI 3（`openapi.yaml`）+ Swagger UI |
| 測試 | Jest + Supertest（連接真實的 PostgreSQL） |
| CI | GitHub Actions：lint、測試、gitleaks、`npm audit` |
| 部署 | AWS EC2（Docker Compose）+ CloudFront |

### 目錄結構

```
openapi.yaml            API 文件
src/
  app.js                組裝 Express app（middleware 與路由）
  server.js             啟動入口
  config/               環境變數檢查、資料庫連線、CORS
  routes/               路由定義，串接 middleware 與 controller
  controllers/          處理請求與回應
  entities/             TypeORM EntitySchema（資料表定義）
  middlewares/          登入與權限、輸入驗證、限流、錯誤處理
  validators/           zod schema（輸入欄位白名單）
  migrations/           資料庫結構變更
  seeds/                展示資料與測試帳號
  scripts/              migration 與 seed 的執行入口
  utils/                共用工具（回應格式、JWT、密碼）
tests/                  API 整合測試
docs/                   需求摘要、進度、決策紀錄、資安紀錄、部署文件、資料表關係圖、部署架構圖（architecture.md）
```

資料表關係圖見 [`docs/erd.md`](docs/erd.md)；部署架構見 [`docs/architecture.md`](docs/architecture.md)。

## 本機啟動

需要 Node.js 24 以上與 PostgreSQL（16 以上皆可；正式環境與 CI 使用 18）。沒有安裝 PostgreSQL 的話，可以用 Docker 起一個：

```bash
docker run -d --name runner-gear-pg -p 127.0.0.1:5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=runner_gear postgres:18-alpine
```

這個資料庫只綁定在本機（`127.0.0.1`），帳號密碼都是 `postgres`，僅供本機開發使用。

接著：

```bash
git clone https://github.com/hy0210/runner-gear-api.git
cd runner-gear-api
npm ci

cp .env.example .env      # 依下方「環境變數」填入
npm run migration:run     # 建立資料表
npm run seed              # 建立 5 個分類、35 筆商品與兩個測試帳號
npm run dev               # 啟動，預設 http://localhost:3000
```

啟動後可開啟 <http://localhost:3000/api-docs> 查看 API 文件，或以 `curl http://localhost:3000/health` 確認服務正常。

也可以用 Docker Compose 一次啟動 API 與資料庫（與正式環境相同的方式）：`docker compose up -d --build` 啟動時會自動套用 migration，再執行 `docker compose exec api npm run seed` 建立資料。本機若 80 埠已被占用，在 `.env` 設定 `API_HOST_PORT`。

### 常用指令

| 指令 | 用途 |
|---|---|
| `npm run dev` | 啟動（檔案變動時自動重啟） |
| `npm start` | 啟動 |
| `npm run migration:run` | 套用尚未執行的 migration |
| `npm run migration:revert` | 還原最後一次 migration |
| `npm run seed` | 重建分類與商品，並建立兩個測試帳號（會清空所有購物車） |
| `npm run seed:admin` | 只建立或更新管理員 |
| `npm run lint` | ESLint |
| `npm test` | 執行測試 |

## 環境變數

複製 `.env.example` 為 `.env` 後填入。留空的變數視為未設定。`.env` 不會進版本庫。

| 變數 | 必填 | 說明 |
|---|---|---|
| `NODE_ENV` | | `development`（預設）、`test`、`production`。Docker Compose 固定為 `production` |
| `PORT` | | API 監聽的埠，預設 3000 |
| `DB_HOST` | ✔ | PostgreSQL 主機。本機開發填 `localhost`；Docker Compose 會自動指定 |
| `DB_PORT` | | PostgreSQL 埠，預設 5432 |
| `DB_USERNAME` | ✔ | 資料庫帳號 |
| `DB_PASSWORD` | ✔ | 資料庫密碼 |
| `DB_DATABASE` | ✔ | 資料庫名稱 |
| `API_HOST_PORT` | | 只給 Docker Compose 使用：對應到主機的埠，預設 80 |
| `CORS_ORIGINS` | 正式環境必填 | 允許跨來源請求的前端網址，以逗號分隔，例如 `http://localhost:5173` |
| `JWT_SECRET` | ✔ | JWT 簽章密鑰，至少 32 個字元。可用 `openssl rand -hex 32` 產生 |
| `JWT_EXPIRES_IN` | | JWT 有效期限，例如 `12h`、`7d`，預設 `7d` |
| `TRUST_PROXY` | | 前方反向代理的層數。正式環境預設 1（CloudFront），其餘預設 0 |
| `MEMBER_EMAIL`、`MEMBER_PASSWORD`、`MEMBER_NAME` | seed 時必填 | 一般會員測試帳號，只有 `npm run seed` 會讀取 |
| `ADMIN_EMAIL`、`ADMIN_PASSWORD`、`ADMIN_NAME` | seed 時必填 | 管理員測試帳號，只有 `npm run seed`、`npm run seed:admin` 會讀取 |

缺少必填變數或格式不正確時，服務會拒絕啟動並指出是哪一個變數。

## 測試

測試會連到真實的 PostgreSQL，並在每個測試檔開始時**清空並重建測試資料庫**，所以使用獨立的資料庫 `runner_gear_test`（名稱不是以 `_test` 結尾時會拒絕執行）。

```bash
# 在上面用 Docker 啟動的 PostgreSQL 裡建立測試資料庫（只需一次）
docker exec runner-gear-pg createdb -U postgres runner_gear_test

npm test
```

測試的連線設定預設為 `localhost:5432`、帳號密碼 `postgres`／`postgres`，不會讀取 `.env`；需要調整時以環境變數覆寫，例如 `DB_PORT=5433 npm test`。

## 相關文件

- [`docs/requirements.md`](docs/requirements.md)：需求與評分標準摘要
- [`docs/erd.md`](docs/erd.md)：資料表關係圖
- [`docs/architecture.md`](docs/architecture.md)：部署架構圖
- [`docs/security.md`](docs/security.md)：資安檢查清單、已知風險與各批次審查紀錄
- [`docs/decisions.md`](docs/decisions.md)：技術決策紀錄
- [`docs/PROGRESS.md`](docs/PROGRESS.md)：開發進度
