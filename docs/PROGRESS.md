# 進度

## 目前狀態
- 里程碑：M2 文件與上線（批次 4 待審）
- 進行中的分支與 issue：`feat/be-release`（#10、#11、#12）已完成並送審
- 下一步：後端部署 → 線上冒煙測試 → 前端批次 5（`hy0210/runner-gear-web`）
- 等使用者處理：
  1. 審查並合併批次 4 的 PR 與 ERD 的 PR #16（一般 merge，不 squash）
  2. AWS（設定流程步驟 3）完成後，依 `docs/deploy.md` 在 EC2 部署並執行 seed
  3. 提供 CloudFront 網域、一般會員與管理員測試帳號的 email 與密碼，以補上 README 的「線上網址」與「測試帳號」
  4. 部署後執行 `docs/deploy.md` 的「六、線上冒煙測試」與「七、部署後的資安檢查」，並用瀏覽器確認 `/api-docs` 頁面正常
  5. 用瀏覽器確認展示商品的佔位圖能顯示（例：`https://placehold.co/600x600/1d4ed8/ffffff?text=Aero+3`）
  6. `main` 保護規則（必要檢查：`lint-and-test`、`security-scan`；合併方式只留 Merge）

## 批次總覽
| 批次 | 分支 | 里程碑 | issue | 狀態 |
|---|---|---|---|---|
| 1 | `feat/be-foundation` | M0 骨架 | #1 專案初始化、#2 資料庫、#3 共用機制 | ✅ 已合併（PR #13） |
| 2 | `feat/be-auth` | M1 | #4 註冊登入、#5 auth middleware 與管理員 seed | ✅ 已合併（PR #14） |
| 3 | `feat/be-shop` | M1 | #6 商品瀏覽、#7 商品管理、#8 購物車、#9 測試資料 seed | ✅ 已合併（PR #15） |
| 4 | `feat/be-release` | M2 文件與上線 | #10 API 文件、#11 部署、#12 README | 待審（PR 已開） |

前端批次 5–7 的進度見 `hy0210/runner-gear-web` 的 `docs/PROGRESS.md`。

## 線上環境
- API Base URL：之後補（CloudFront 網域）
- 前端 URL：之後補
- API 文件網址：之後補（`<API Base URL>/api-docs`）
- 線上冒煙測試：尚未執行（部署後依 `docs/deploy.md` 第六節進行，結果記在這裡）

## 繳交與退回紀錄
| 日期 | 評分者回饋 | 對應修正 issue |
|---|---|---|
| （尚未繳交） | | |
