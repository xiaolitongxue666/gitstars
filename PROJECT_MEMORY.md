# PROJECT_MEMORY.md

Gitstars 自托管（Docker + `/gitstars/` 子路径）项目记忆。最后更新：2026-09-17。

## 编号事实（≤25）

1. 自托管栈：`docker/` + `server.js`（Express 静态 + OAuth + GitHub API 反代）。
2. 生产：`network_mode: host`，`SERVER_PORT=8091`；vps_nginx rewrite 反代 `/gitstars/`。
3. 构建需 `VITE_BASE_PATH=/gitstars/`、`VITE_GITSTARS_CLIENT_ID`（build arg）；Secret 仅 runtime `.env`（LF 换行）。
4. 子路径：axios `baseURL: import.meta.env.BASE_URL`（OAuth）；GitHub API 走 `${BASE_URL}api/github`。
5. OAuth `redirect_uri` 须含 `/gitstars/` 尾斜杠，与 GitHub App callback 一致。
6. 所有 GitHub API / raw 请求经容器反代 → `HTTP_PROXY=http://127.0.0.1:17890`（mihomo）出站。
7. mihomo 只绑 `127.0.0.1:17890`，**必须 host 网络**；桥接 + `host.docker.internal` 不可用。
8. 反代路由：`/api/github/*` → api.github.com；`/api/github-raw/*` → raw.githubusercontent.com；用 `undici` ProxyAgent。
9. Star 列表逐页顺序加载，首页返回即展示；有 `localStorage` 缓存时先展示再刷新。
10. `main.js` 先 `mount` 再异步拉 token/userinfo，避免登录页被 GitHub API 阻塞。
11. 转圈看 `repositoryStore.loading`，非 `all.length === 0`。
12. 修改前端/Client ID 后 `docker compose build --no-cache`；`--force-recreate` 停旧容器约 10s 无输出属正常。
13. VPS curl 走系统代理会 502，验证用 `curl --noproxy "*"`。
14. pnpm 10 Docker 构建需 `--config.dangerouslyAllowAllBuilds=true`。
15. `api/oauth/access_token.js` 为 Vercel Edge；自托管用 `server.js`。
16. Agent 入口 `AGENTS.md`。本机 `Code/VPS/gitstars`；生产 `/home/ubuntu/Code/Web/gitstars`。vps_nginx routing 主表含 `/gitstars/`。

## 问题 / 解法

| 问题 | 解法 |
|------|------|
| 授权后 404 | axios OAuth `baseURL: import.meta.env.BASE_URL` |
| Star 列表久转圈 | 反代 + 逐页加载；检查 `/gitstars/api/github/user/starred` 是否 200 |
| 代理容器连不上 17890 | 改 `network_mode: host`，勿用桥接 + host.docker.internal |
| undici 模块找不到 | `package.json` 加 `undici` 依赖，勿用 `node:undici` |
| OAuth Secret 无效 | `.env` CRLF → `sed -i 's/\r$//'` |
| 修复未上线 | `docker compose build --no-cache` |
| curl 本地 502 | `--noproxy "*"` |

## 关键路径

- 服务端：`server.js`、`docker/compose.yml`、`docker/Dockerfile`
- 前端代理：`src/server/http-request.js`、`src/server/github.js`
- 加载逻辑：`src/store/repository.js`、`src/main.js`
- 部署：`docker/DEPLOY.md`
- Nginx（VPS 另仓）：`~/Code/VPS/vps_nginx`
