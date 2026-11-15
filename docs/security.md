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
- `.env` 不進版本庫；agent 不讀寫 `.env`。

## 已知風險
- 需求規定 README 要公開管理員測試帳號，任何人都能刪改商品。對策：seed 可重複執行還原資料；審核期間每天檢查一次商品資料。

## 各批次審查紀錄
（每個批次 PR 送審前補上：日期、審查範圍、發現的問題與判定「必改／建議改／可不改」、處理結果）
