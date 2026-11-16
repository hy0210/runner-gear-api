# 進度

## 目前狀態
- 里程碑：M2 文件與上線（後端已上線）
- 進行中的分支與 issue：無（後端 #1–#12 皆已完成）
- 下一步：前端批次 7（`hy0210/runner-gear-web`：Amplify 部署與線上驗收）；前端上線後把前端網址加入後端的 `CORS_ORIGINS`
- 等使用者處理：
  1. 前端部署後，在 EC2 的 `.env` 把前端網址加進 `CORS_ORIGINS`，再執行 `docker compose up -d`
  2. 審核期間（至 12/04）每天確認一次商品資料完整；被改亂時執行 `docker compose exec api npm run seed`

## 批次總覽
| 批次 | 分支 | 里程碑 | issue | 狀態 |
|---|---|---|---|---|
| 1 | `feat/be-foundation` | M0 骨架 | #1 專案初始化、#2 資料庫、#3 共用機制 | ✅ 已合併（PR #13） |
| 2 | `feat/be-auth` | M1 | #4 註冊登入、#5 auth middleware 與管理員 seed | ✅ 已合併（PR #14） |
| 3 | `feat/be-shop` | M1 | #6 商品瀏覽、#7 商品管理、#8 購物車、#9 測試資料 seed | ✅ 已合併（PR #15） |
| 4 | `feat/be-release` | M2 文件與上線 | #10 API 文件、#11 部署、#12 README | 待審（PR 已開） |

前端批次 5–7 的進度見 `hy0210/runner-gear-web` 的 `docs/PROGRESS.md`。

## 線上環境
- API Base URL：<https://d1461t9n4hr1h9.cloudfront.net>
- 前端 URL：之後補（Amplify）
- API 文件網址：<https://d1461t9n4hr1h9.cloudfront.net/api-docs>
- 線上冒煙測試：2026/11/16 通過。依部署操作步驟在線上 Swagger UI 完成 8 項：商品列表 35 筆、未登入購物車 401、會員登入、帶 Token 查看購物車 200、重複加入同一商品累加、會員呼叫管理員 API 403、管理員編輯商品 200

## 繳交與退回紀錄
| 日期 | 評分者回饋 | 對應修正 issue |
|---|---|---|
| （尚未繳交） | | |
