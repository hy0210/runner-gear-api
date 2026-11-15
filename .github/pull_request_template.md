## 這個 PR 包含的 issue
Closes #

## 審查摘要
| issue | 做了什麼 |
|---|---|
| # | |

**請特別看（3 點以內）**
1.

## 驗收
- [ ] 所含 issue 的每個 Scenario 都有對應測試且通過
- [ ] CI（lint-and-test、security-scan）綠燈
- [ ] `docs/PROGRESS.md` 已更新；API 有變動時 `openapi.yaml` 已同步

## 資安檢查
- [ ] 沒有機密值進版本庫（gitleaks 通過，`.env` 未被追蹤）
- [ ] 所有輸入都經過驗證，寫入以白名單取欄位
- [ ] 權限有測試（401、403）
- [ ] 錯誤回應不洩漏內部資訊；回應不含密碼欄位
- [ ] 獨立資安審查已完成，「必改」項目已修完（結果見 PR 留言與 `docs/security.md`）
