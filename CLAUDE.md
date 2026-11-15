# agent 工作規則（runner-gear-api）

六角學院單人專題：跑步裝備店電商平台的後端。目標是及格，需求文件沒寫的一律不做。

## 開工前
1. 讀 `docs/PROGRESS.md`（進度的單一事實來源）。
2. 查看未關閉的 issue 與待審的 PR。
3. 需求與評分標準見 `docs/requirements.md`；已做的決定見 `docs/decisions.md`。

## 流程（SDD，批次進行）
- 先有 spec issue（標 `spec:ready`）才實作。要改 spec，先改 issue 再改程式；超出 spec 的想法不做。
- 一批相似的 issue 共用一個分支與一個 PR，分支名稱依 `docs/PROGRESS.md` 的批次總覽，不另外多開。
- 先把 Scenario 寫成測試並確認失敗，再實作到全過。
- 每個 commit 只對應一張 issue，訊息帶編號，例：`feat(cart): 加入購物車 API (#8)`。
- **開 PR 之前依序做送審前自我檢查，跑完才開 PR**（詳見計畫第 4 節第 5 步）：
  1. `/simplify`：檢查這一批新增的程式有沒有重複、可改用既有工具、不必要的複雜度、明顯的效率問題。
  2. `/code-review`：檢查有沒有 bug、邏輯漏洞、與 spec 不一致、可讀性問題。
  3. 獨立資安審查（見下方「資安」）；放最後，才會涵蓋前兩步的修改。
  - 這兩個是 Claude Code 的指令，Claude Desktop 不一定能用；不能用就以同樣原則自行審查（可用 `/code-review-zh` skill），並在 PR 審查摘要註明用了哪一種。
  - 要不要改由 agent 判斷，不必刁鑽：真正的問題（bug、與 spec 不符、資安、明顯重複或過度複雜）才修；純風格偏好、小幅重構一律不動。修改歸屬單一 issue 的 commit，改完重跑 lint 與測試，並在 PR 審查摘要各記一行（發現什麼、改了什麼、哪些不改）。
- PR 內文列出 `Closes #n`，附審查摘要；同步更新 `docs/PROGRESS.md`，API 有變動時更新 `openapi.yaml`。
- **不可自行合併 PR**（不執行 `gh pr merge`，也不用 API 合併）。由使用者審查並以一般 merge 合併。
- 不影響最終結果的技術細節自行決定，並在 `docs/decisions.md` 記一行；只有風格偏好與會影響結果的決策才問使用者。

## 資安
- **不讀寫 `.env` 與任何機密值**；只維護 `.env.example`（只有變數名稱）。
- 不持有 AWS 憑證；AWS、Repo 設定、機密值、寄信由使用者處理。
- 每個 PR 送審前，由另一個 agent session 做獨立資安審查，結果寫入 `docs/security.md` 並貼在 PR 留言；「必改」修完才通知使用者。
- 程式必須遵守 `docs/security.md` 的「應用程式安全需求」。

## 程式慣例
- Node.js 22、Express 5、CommonJS、JavaScript。
- 分層：`routes`（路由與 middleware 串接）→ `controllers`（處理請求與回應）→ `entities`（TypeORM EntitySchema）；輸入驗證集中在 `validators`（zod）。
- 資料庫變更一律寫 migration，不使用 `synchronize`。
- 指令：`npm run lint`、`npm test`（需要測試資料庫，連線設定見 `tests/setup-env.js`）。
