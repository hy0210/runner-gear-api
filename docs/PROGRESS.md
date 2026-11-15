# 進度

## 目前狀態
- 里程碑：M1 商品與購物車（批次 3 待審）
- 進行中的分支與 issue：`feat/be-shop`（#6、#7、#8、#9）已完成並送審
- 下一步：批次 4 `feat/be-release`（#10 API 文件、#11 部署、#12 README）
- 等使用者處理：
  1. 審查並合併批次 3 的 PR（一般 merge，不 squash）
  2. 開啟 CodeQL、設定 `main` 保護規則（必要檢查：`lint-and-test`、`security-scan`）；Dependabot alerts、Push protection
  3. AWS（設定流程步驟 3），完成後提供 CloudFront 網域（#11）
  4. 決定一般會員與管理員測試帳號的 email 與密碼（#12；值設定在 EC2 的 `.env`，變數名稱見 `.env.example`）
  5. 用瀏覽器開一張展示商品的圖片網址，確認佔位圖能正常顯示（例：`https://placehold.co/600x600/1d4ed8/ffffff?text=Aero+3`）

## 批次總覽
| 批次 | 分支 | 里程碑 | issue | 狀態 |
|---|---|---|---|---|
| 1 | `feat/be-foundation` | M0 骨架 | #1 專案初始化、#2 資料庫、#3 共用機制 | ✅ 已合併（PR #13） |
| 2 | `feat/be-auth` | M1 | #4 註冊登入、#5 auth middleware 與管理員 seed | ✅ 已合併（PR #14） |
| 3 | `feat/be-shop` | M1 | #6 商品瀏覽、#7 商品管理、#8 購物車、#9 測試資料 seed | 待審（PR 已開） |
| 4 | `feat/be-release` | M2 文件與上線 | #10 API 文件、#11 部署、#12 README | 未開始 |

前端批次 5–7 的進度見 `hy0210/runner-gear-web` 的 `docs/PROGRESS.md`。

## 線上環境
- API Base URL：之後補（CloudFront 網域）
- 前端 URL：之後補
- API 文件網址：之後補（`<API Base URL>/api-docs`）

## 繳交與退回紀錄
| 日期 | 評分者回饋 | 對應修正 issue |
|---|---|---|
| （尚未繳交） | | |
