# 決策紀錄

agent 自行決定的事項與理由，一行一條。使用者回答過的決策也記在這裡（標「使用者」）。

| 日期 | 相關 issue | 決定 | 理由 |
|---|---|---|---|
| 11/15 | #1 | Express 5、CommonJS、Node.js 22 | Express 5 為目前預設版本；CommonJS 設定最少 |
| 11/15 | #1 | ESLint 10 flat config + eslint-plugin-security | 計畫指定的寫法層資安檢查 |
| 11/15 | #1 | 環境變數在啟動時以 zod 檢查，有誤即拒絕啟動，訊息只列變數名稱 | 及早發現設定錯誤，且不把值印到記錄 |
| 11/15 | #1 | 測試不讀 `.env`，連線設定寫在 `tests/setup-env.js`（可用環境變數覆寫） | agent 不碰 `.env`；CI 與本機用同一份預設值 |
| 11/15 | #1 | CI 分成 `lint-and-test` 與 `security-scan` 兩個工作；`lint-and-test` 另外執行 `docker build` | 之後 `main` 保護規則直接勾這兩個名稱；映像檔建置失敗能在 CI 就發現 |
| 11/15 | #1 | GitHub Actions 以主版本標籤引用（`@v6`、`@v2`），不釘 commit SHA | 專題規模下維護成本較低 |
| 11/15 | #1 | `npm audit` 門檻為 high；目前 16 個 moderate、3 個 low 都在 Jest 的開發相依套件，正式相依套件為 0 | 計畫規定 high 以上才擋；開發套件不進正式映像檔 |
| 11/15 | #1 | `docker-compose.yml` 的主機埠可用 `API_HOST_PORT` 覆寫，預設 80 | 正式環境固定 80；本機 80 埠被占用時可改 |
| 11/15 | #1 | API 路徑前綴為 `/api/v1`；`/health`、`/api-docs` 掛在根路徑 | 常見慣例，健康檢查與文件網址較短 |
| 11/15 | #2 | 主鍵一律用自動遞增整數 | 驗證與測試最單純；沒有任何以會員 id 查詢的公開 API |
| 11/15 | #2 | 價格以新台幣「元」的整數儲存，check `price >= 0` | 避免浮點誤差 |
| 11/15 | #2 | migration 以手寫 SQL 撰寫並為每個約束命名；測試會比對 migration 結果與 entity 定義是否一致 | 約束一目了然（對應資料庫設計評分），且兩邊不會悄悄走樣 |
| 11/15 | #2 | 以 `node src/scripts/migrate.js` 執行 migration，不用 TypeORM CLI；容器啟動時自動套用 | 少一層 CLI 設定；部署只需 `docker compose up` |
| 11/15 | #2 | 刪除商品時連帶刪除購物車項目（CASCADE）；分類底下有商品時禁止刪除（RESTRICT）；刪除會員時連帶刪除其購物車 | 管理員刪商品不應被他人的購物車擋住；分類不應被誤刪 |
| 11/15 | #2 | 不做庫存欄位 | 需求沒有訂單與庫存 |
| 11/15 | #2 | 測試直接連 PostgreSQL（CI 用 service container），每個測試檔開始時重建結構 | 約束必須在真的資料庫上驗證 |
