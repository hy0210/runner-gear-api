# 資安檢查清單與紀錄

## 流程上的檢查
| 時機 | 檢查 |
|---|---|
| 寫 spec | issue 必填「安全考量」，否則不得標 `spec:ready` |
| 每次 push / PR（CI） | gitleaks、`npm audit --audit-level=high`、eslint-plugin-security |
| GitHub 內建 | Secret scanning、push protection、Dependabot alerts、CodeQL（由使用者開啟） |
| 每個批次 PR 送審前 | 另一個 agent session 做獨立資安審查，結果記在本文件與 PR 留言 |
| 繳交前 | 線上實測：無 Token 打購物車得 401、會員打管理員 API 得 403、註冊帶 role 無效、回應不含密碼雜湊 |

## 應用程式安全需求
- 密碼以 bcrypt 雜湊；登入失敗訊息不透露是帳號還是密碼錯誤；任何回應都不含密碼欄位。
- JWT 有期限，密鑰為足夠長的隨機字串，只存在環境變數。
- 所有寫入 API 以白名單取欄位，使用者無法自行帶入 `role`、`userId` 等欄位。
- 購物車一律以 Token 內的使用者身分查詢，不接受請求指定使用者。
- 查詢一律用 TypeORM 參數化，不拼接 SQL 字串。
- helmet、CORS 僅允許前端網域、登入與註冊限流、請求大小上限；正式環境錯誤回應不帶 stack trace。
- 回應一律明確挑選欄位，不直接回傳 entity 或 `save()` 的結果（`save()` 的回傳值仍帶有 `password`）。
- email 一律轉小寫後再儲存與比對，避免大小寫不同造成重複帳號。
- validator 一律用 `z.object`（預設丟棄未知欄位），不用 `looseObject`、`passthrough`；數值欄位要設上限。
- 伺服器記錄不印整個錯誤物件（資料庫錯誤會帶 SQL 參數）。
- `.env` 不進版本庫；agent 不讀寫 `.env`。

## 已知風險
- 需求規定 README 要公開管理員測試帳號，任何人都能刪改商品。對策：seed 可重複執行還原資料；審核期間每天檢查一次商品資料。

## 各批次審查紀錄

### 批次 1｜`feat/be-foundation`（#1、#2、#3）｜2026/11/15
審查者：獨立的 agent session（唯讀）。範圍：分支相對 `main` 的全部變更，並實際執行 lint、測試與行內探測。
結論：**沒有「必改」**；9 項「建議改」、6 項「可不改」。

| 編號 | 發現 | 判定 | 處理 |
|---|---|---|---|
| A1 | 未預期錯誤以 `console.error(err)` 整個印出，資料庫錯誤會把 SQL 參數（email、密碼雜湊）寫進記錄 | 建議改 | ✅ 已修：只記錄名稱、代碼、stack，並加測試 |
| A2 | 測試會清空資料庫，但沒確認連到的是測試資料庫 | 建議改 | ✅ 已修：非 `NODE_ENV=test` 或資料庫名稱不以 `_test` 結尾即拒絕 |
| A3 | CI 的 `cancel-in-progress` 可能讓某次 push 的 gitleaks 掃描被取消 | 建議改 | ✅ 已修：只有 PR 事件會取消舊的執行 |
| A4 | CI 失敗只是紅燈，要真的擋下合併需要 `main` 保護規則 | 建議改 | ⏳ 使用者：批次 1 合併後設定（設定流程 2-3），必要檢查勾 `lint-and-test`、`security-scan` |
| A5 | `.claude/settings.json` 的 deny 只管內建檔案工具與 `gh pr merge`，擋不住 Bash 讀 `.env` 或用 API 合併 | 建議改 | ⏳ 使用者決定是否加嚴（agent 不自行更動權限設定）；實質防線為 `main` 保護規則與 `.env` 只存在 EC2 |
| A6 | email 的 unique 約束區分大小寫 | 建議改 | ➡️ 批次 2：已寫入 #4 的安全考量（一律轉小寫） |
| A7 | `select: false` 只保護查詢，`save()` 回傳值仍帶 `password` | 建議改 | ➡️ 批次 2：已寫入 #4 與上方安全需求（回應明確挑欄位並加測試） |
| A8 | body-parser 的其他 4xx（如不支援的編碼）被當成 500 | 建議改 | ✅ 已修：回原狀態碼與固定訊息，並加測試 |
| A9 | 尚未設定 `trust proxy`，CloudFront 後方的限流會失準 | 建議改 | ➡️ 批次 2：已寫入 #4 的安全考量 |
| B1 | Actions 以主版本標籤引用，未釘 SHA | 可不改 | 不改（見 decisions.md） |
| B2 | API 以 PostgreSQL 的管理帳號連線 | 可不改 | 不改（專題規模可接受） |
| B3 | compose 沒有容器加固、機密未設必填檢查 | 可不改 | ✅ 已加 `no-new-privileges` 與必填檢查 |
| B4 | `.env` 的 `NODE_ENV` 會蓋過映像檔的 `production` | 可不改 | ➡️ 批次 4：部署文件註明必須為 `production` |
| B5 | 回應開始送出後再出錯，錯誤處理會再丟一次例外 | 可不改 | ✅ 已修 |
| B6 | 資料庫層沒擋空字串與數值上限 | 可不改 | ➡️ 由各批次的 validator 處理（已列入安全需求） |

已檢查且無問題：無機密入庫、`.gitignore` 與 `.dockerignore` 足夠；錯誤回應不洩漏內部資訊；驗證 middleware 的白名單與原型污染；CORS、helmet、body 上限；資料庫約束與 migration 一致性；容器以非 root 執行、資料庫不對外；CI 權限最小且無注入面。
部署時注意（批次 4 納入 `docs/deploy.md`）：CloudFront 需轉送 `Origin` 標頭（`AllViewerExceptHostHeader` 已包含）。
