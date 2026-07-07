# PROJECT_MEMORY.md

Gitstars 自托管（Docker + `/gitstars/` 子路径）项目记忆。最后更新：2026-07-07。

## 编号事实（≤25）

1. 官方 main 无 Dockerfile；自托管新增 `docker/` + `server.js`（Express 静态 + OAuth API）。
2. 生产部署：`127.0.0.1:8091`，vps_nginx 以 feynflow 模式 rewrite 反代 `/gitstars/`。
3. 构建需 `VITE_BASE_PATH=/gitstars/` 与 `VITE_GITSTARS_CLIENT_ID`（build arg）；Secret 仅 runtime `.env`。
4. 子路径下 axios 必须 `baseURL: import.meta.env.BASE_URL`，否则 OAuth 请求打到 `/api/...` 返回 404。
5. OAuth `redirect_uri` 须为 `new URL(import.meta.env.BASE_URL, location.origin).href`，与 GitHub App callback 一致（含尾斜杠）。
6. `docker/.env` 禁止提交；须 LF 换行，CRLF 会使 Secret 带 `\r` 导致 OAuth 失败（`sed -i 's/\r$//'` 修复）。
7. 修改前端或 Client ID 后需 `docker compose build --no-cache`；Docker 可能缓存 dist 层导致修复未生效。
8. `docker compose up --force-recreate` 停旧容器默认约 10 秒无输出，非卡死。
9. VPS curl 若走系统代理会 502，验证时用 `curl --noproxy "*"`。
10. 容器内 OAuth 仅 `POST /api/oauth/access_token` → github.com；其余 GitHub API 由**浏览器**直连。
11. VPS 代理（如 mihomo `127.0.0.1:17890`）仅可选用于容器 OAuth；Ranking/Star 列表不走 VPS 代理。
12. 容器访问宿主机代理用 `host.docker.internal:17890` + `extra_hosts: host-gateway`，不可用容器内 `127.0.0.1`。
13. pnpm 10 在 Docker 构建需 `--config.dangerouslyAllowAllBuilds=true`。
14. `api/oauth/access_token.js` 为 Vercel Edge；自托管逻辑在 `server.js`。
15. 公网暴露：`VPS_NGINX_PUBLIC_EXPOSE` 含 `gitstars`，端口 env `VPS_NGINX_UPSTREAM_GITSTARS_PORT=8091`。

## 问题 / 解法

| 问题 | 解法 |
|------|------|
| 授权后 404 | `http-request.js` 加 `baseURL: import.meta.env.BASE_URL` |
| OAuth Secret 无效 | `.env` CRLF → `sed -i 's/\r$//'` + recreate 容器 |
| 修复未上线 | `docker compose build --no-cache` |
| curl 本地 502 | `--noproxy "*"` |
| 构建 pnpm ERR_PNPM_IGNORED_BUILDS | Dockerfile 用 pnpm@10 + dangerouslyAllowAllBuilds |

## 关键路径

- 应用：`server.js`、`docker/Dockerfile`、`docker/compose.yml`
- 子路径：`vite.config.js`、`src/components/unauth.vue`、`src/server/http-request.js`
- 部署文档：`docker/DEPLOY.md`
- Nginx（VPS 另仓）：`~/Code/VPS/vps_nginx` — `gitstars.conf.tpl`、`routing-contract.md`
