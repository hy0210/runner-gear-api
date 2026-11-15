# 部署文件（EC2 + Docker Compose + CloudFront）

對象：在 EC2 上操作的你。前提是已照「開工前設定流程」步驟 3 完成：EC2（已裝 Docker、已加 swap）、Elastic IP、安全群組、CloudFront。

所有指令都在 EC2 上以 `ubuntu` 使用者執行（Session Manager 連線後先 `sudo su - ubuntu`）。

## 架構

```
瀏覽器 ──HTTPS──▶ CloudFront ──HTTP 80──▶ EC2 ┬─ api 容器（Express，容器內 3000 埠）
                                              └─ db 容器（PostgreSQL，不對外）
```

- 對外網址（API Base URL）是 CloudFront 網域：`https://dxxxx.cloudfront.net`
- API 文件：`<API Base URL>/api-docs`
- 資料存在 Docker volume `db-data`，重建容器不會遺失

## 一、首次部署

### 1. 取得程式

```bash
cd ~
git clone https://github.com/hy0210/runner-gear-api.git
cd runner-gear-api
```

### 2. 建立 `.env`

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

依下表填入。**沒列到的變數全部留空**（留空會使用預設值）。

| 變數 | 填什麼 |
|---|---|
| `DB_USERNAME` | 自訂，例如 `runner` |
| `DB_PASSWORD` | 隨機字串。產生方式：`openssl rand -hex 24` |
| `DB_DATABASE` | 自訂，例如 `runner_gear` |
| `JWT_SECRET` | 隨機字串。產生方式：`openssl rand -hex 32` |
| `CORS_ORIGINS` | 前端網址，多個以逗號分隔、不加結尾斜線。前端還沒部署時先填 `http://localhost:5173`，Amplify 網址出來後再補上（見「四、更新設定」） |
| `MEMBER_EMAIL`、`MEMBER_PASSWORD`、`MEMBER_NAME` | 一般會員測試帳號（會公開在 README） |
| `ADMIN_EMAIL`、`ADMIN_PASSWORD`、`ADMIN_NAME` | 管理員測試帳號（會公開在 README） |

注意事項：

- `DB_USERNAME`、`DB_PASSWORD`、`DB_DATABASE` **在第一次啟動後就不能直接改**（PostgreSQL 只在第一次建立資料時讀取）。
- 測試帳號的密碼至少 8 個字元；因為會公開，請用專題專用的密碼。兩個帳號的 email 不能相同。
- `NODE_ENV`、`PORT`、`DB_HOST`、`DB_PORT` 由 `docker-compose.yml` 固定，填了也不會生效。
- `TRUST_PROXY` 留空即可（正式環境預設 1，對應 CloudFront 一層）。**不要設成 2 以上**，否則限流可以被偽造的標頭繞過。
- `.env` 只存在這台主機，不要貼到任何對話、issue 或提交到版本庫。

### 3. 啟動

```bash
docker compose up -d --build
```

第一次建置約需數分鐘。啟動時 API 容器會自動套用資料庫 migration。

### 4. 確認服務正常

```bash
docker compose ps                 # api 與 db 都應為 running，db 為 healthy
docker compose logs api --tail 30 # 應看到「已套用 1 個 migration」與「API 已啟動」
curl -s http://localhost/health   # 應回 {"status":"success","data":{"message":"ok"}}
```

若 `api` 不斷重啟，看 `docker compose logs api`：設定有問題時會列出是哪個環境變數（只列名稱，不會印出值）。

### 5. 建立展示資料與測試帳號

**請在把網址公開之前完成這一步**，避免有人搶先用管理員的 email 註冊。

```bash
docker compose exec api npm run seed
```

成功時會顯示「展示資料已重建：5 個分類、35 筆商品；一般會員 …、管理員 …」。

### 6. 從外部確認

在自己的電腦上（把網域換成你的 CloudFront 網域）：

```bash
curl -s https://dxxxx.cloudfront.net/health
```

再用瀏覽器開 `https://dxxxx.cloudfront.net/api-docs`，應看到 API 文件。接著做「六、線上冒煙測試」。

## 二、更新版本

`main` 有新的合併後：

```bash
cd ~/runner-gear-api
git pull
docker compose up -d --build
docker compose logs api --tail 30
```

資料庫資料會保留；有新的 migration 時會在啟動時自動套用。

## 三、還原展示資料

商品被改亂或刪除時（管理員帳號是公開的，這是預期中的情況）：

```bash
docker compose exec api npm run seed
```

- 分類與商品會清空後重建，商品 id 也會恢復成初始值。
- **所有會員的購物車會被清空**；其他人自己註冊的會員帳號會保留。
- 兩個測試帳號的密碼與姓名會重設為 `.env` 裡的值。

只想重設管理員的密碼、不動商品：修改 `.env` 的 `ADMIN_PASSWORD` 後執行

```bash
docker compose up -d                      # 讓容器讀到新的 .env
docker compose exec api npm run seed:admin
```

## 四、更新設定

修改 `.env` 之後要重新建立容器才會生效：

```bash
nano .env
docker compose up -d
```

最常見的情況是前端部署後補上 CORS 來源：

```
CORS_ORIGINS=https://main.xxxxxxxx.amplifyapp.com,http://localhost:5173
```

## 五、常用維運指令

| 目的 | 指令 |
|---|---|
| 看 API 記錄 | `docker compose logs api --tail 100 -f` |
| 重新啟動 API | `docker compose restart api` |
| 停止全部服務（保留資料） | `docker compose down` |
| 進資料庫查資料 | `docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'` |
| 手動套用 migration | `docker compose exec api npm run migration:run` |

- **主機重開機**：兩個容器都設定了 `restart: unless-stopped`，Docker 服務也已設為開機啟動，重開機後會自動恢復，不需要手動操作。可用 `sudo reboot` 後等一兩分鐘，再以 `curl -s http://localhost/health` 驗證。
- **緊急讓所有登入失效**（例如懷疑 Token 外洩）：把 `.env` 的 `JWT_SECRET` 換成新的隨機字串，再執行 `docker compose up -d`。所有人都需要重新登入。
- **不要執行** `docker compose down -v`：`-v` 會刪除資料庫的 volume，所有資料都會消失。

## 六、線上冒煙測試

部署或更新後，在自己的電腦上執行。先設定變數（換成實際的值）：

```bash
API='https://dxxxx.cloudfront.net'
MEMBER_EMAIL='member@example.com'
MEMBER_PASSWORD='換成一般會員測試帳號的密碼'
ADMIN_EMAIL='admin@example.com'
ADMIN_PASSWORD='換成管理員測試帳號的密碼'
```

值請保留單引號。密碼若含有 `"` 或 `\`，下面組出的 JSON 會壞掉，請避免使用這兩個字元。

逐項執行，確認結果與註解相符：

```bash
# 1. 服務存活 → 200
curl -s -o /dev/null -w '%{http_code}\n' $API/health

# 2. 商品列表有資料 → total 為 35
curl -s "$API/api/v1/products?limit=1" | grep -o '"total":[0-9]*'

# 3. 沒有 Token 打購物車 → 401
curl -s -o /dev/null -w '%{http_code}\n' $API/api/v1/cart

# 4. 註冊一個冒煙測試用的會員，並夾帶 role → 回應中的 role 仍是 member
SMOKE=$(curl -s -X POST $API/api/v1/auth/register -H 'Content-Type: application/json' \
  -d "{\"email\":\"smoke-$(date +%s)@example.com\",\"password\":\"$(openssl rand -hex 8)\",\"name\":\"冒煙測試\",\"role\":\"admin\"}")
echo "$SMOKE" | grep -o '"role":"[a-z]*"'
SMOKE_TOKEN=$(echo "$SMOKE" | sed -E 's/.*"token":"([^"]+)".*/\1/')

# 5. 一般會員登入並取得 Token（回應不應出現 password）
MEMBER_TOKEN=$(curl -s -X POST $API/api/v1/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$MEMBER_EMAIL\",\"password\":\"$MEMBER_PASSWORD\"}" | sed -E 's/.*"token":"([^"]+)".*/\1/')
echo "${MEMBER_TOKEN:0:12}..."

# 6. 一般會員打管理員 API → 403
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE $API/api/v1/admin/products/1 \
  -H "Authorization: Bearer $MEMBER_TOKEN"

# 7. 用剛註冊的冒煙帳號（購物車是空的）加入同一商品兩次 → 第二次的 quantity 為 2（同一筆累加）
curl -s -X POST $API/api/v1/cart/items -H "Authorization: Bearer $SMOKE_TOKEN" \
  -H 'Content-Type: application/json' -d '{"productId":1,"quantity":1}' > /dev/null
curl -s -X POST $API/api/v1/cart/items -H "Authorization: Bearer $SMOKE_TOKEN" \
  -H 'Content-Type: application/json' -d '{"productId":1,"quantity":1}' | grep -o '"quantity":[0-9]*'

# 8. 管理員登入後可以編輯商品 → 200
ADMIN_TOKEN=$(curl -s -X POST $API/api/v1/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | sed -E 's/.*"token":"([^"]+)".*/\1/')
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH $API/api/v1/admin/products/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"price":4280}'
```

最後用瀏覽器開 `$API/api-docs`，按 **Authorize** 貼上 Token，確認能在頁面上成功呼叫 `GET /api/v1/cart`。

每跑一次會留下一個冒煙測試用的會員（隨機密碼）與它的購物車內容，不影響評分；購物車可以用「三、還原展示資料」清空。

## 七、部署後的資安檢查

- [ ] EC2 安全群組的 Inbound 只有一條：TCP 80，來源是 CloudFront 的 managed prefix list（`com.amazonaws.global.cloudfront.origin-facing`）。沒有 22、5432。
- [ ] 直接用 EC2 的公開位址連 80 埠會逾時（表示只有 CloudFront 進得來）。
- [ ] `ls -l ~/runner-gear-api/.env` 顯示權限為 `-rw-------`。
- [ ] CloudFront 的 Origin request policy 為 `AllViewerExceptHostHeader`（會轉送 `Authorization` 與 `Origin`）、Cache policy 為 `CachingDisabled`。
- [ ] `docker compose ps` 中 `db` 沒有對應任何主機埠。
- [ ] `.env` 的 `TRUST_PROXY` 留空或為 1。

## 八、審核期結束後（12/04 之後）

依序刪除：CloudFront distribution（先 Disable 再 Delete）→ Amplify app → EC2（Terminate）→ Elastic IP（Release）→ 安全群組 → IAM 角色 → Budget。
