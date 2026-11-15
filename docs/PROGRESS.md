# 進度

## 目前狀態
- 里程碑：M0 骨架（批次 1 待審）
- 進行中的分支與 issue：`feat/be-foundation`（#1、#2、#3）已完成並送審；下一批 `feat/be-auth`（#4、#5）從此分支接續
- 下一步：批次 2 `feat/be-auth` → 批次 3 `feat/be-shop` → 批次 4 `feat/be-release`
- 等使用者處理：
  1. 審查並合併批次 1 的 PR（一般 merge，不 squash）
  2. 合併後：開啟 CodeQL、設定 `main` 保護規則（必要檢查：`lint-and-test`、`security-scan`）
  3. Dependabot alerts、Push protection（設定流程 2-2）
  4. AWS（設定流程步驟 3），完成後提供 CloudFront 網域（#11）
  5. 決定測試帳號的 email 與密碼（#12；值設定在 EC2 的 `.env`）
  6. 決定是否加嚴 `.claude/settings.json`（`docs/security.md` 批次 1 的 A5）

## 批次總覽
| 批次 | 分支 | 里程碑 | issue | 狀態 |
|---|---|---|---|---|
| 1 | `feat/be-foundation` | M0 骨架 | #1 專案初始化、#2 資料庫、#3 共用機制 | 待審（PR 已開） |
| 2 | `feat/be-auth` | M1 | #4 註冊登入、#5 auth middleware 與管理員 seed | 未開始 |
| 3 | `feat/be-shop` | M1 | #6 商品瀏覽、#7 商品管理、#8 購物車、#9 測試資料 seed | 未開始 |
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
