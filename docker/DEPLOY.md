# Gitstars VPS 部署说明

运行时 Node **22**（`docker` 与 `package.json` `engines`）。CORS 默认只放行 `http://127.0.0.1:8091`、`http://localhost:8091`、`https://xiaolitongxue.com.cn`；可用 `GITSTARS_CORS_ORIGIN` 逗号覆盖。勿把该口绑公网。

路径：本机 `Code/VPS/gitstars`；生产 `/home/ubuntu/Code/Web/gitstars`。Agent 入口：[../AGENTS.md](../AGENTS.md)。

最小检查：`bash scripts/smoke-local.sh`。

## 1. 创建 GitHub OAuth App

1. 打开 https://github.com/settings/applications/new
2. 填写：
   - **Application name**: `Gitstars (VPS)`
   - **Homepage URL**: `https://xiaolitongxue.com.cn/gitstars/`
   - **Authorization callback URL**: `https://xiaolitongxue.com.cn/gitstars/`
3. 创建后复制 **Client ID** 与 **Client Secret**（Secret 只显示一次）

## 2. 写入 VPS 环境变量

编辑 `~/Code/Web/gitstars/docker/.env`：

```env
VITE_GITSTARS_CLIENT_ID=你的ClientID
VITE_GITSTARS_CLIENT_SECRET=你的ClientSecret
```

**须 LF 换行**（Windows CRLF 会导致 Secret 末尾 `\r`，OAuth 失败）：

```bash
sed -i 's/\r$//' ~/Code/Web/gitstars/docker/.env
```

## 3. 构建并启动

```bash
cd ~/Code/Web/gitstars/docker
docker compose build --no-cache   # 前端/Client ID 变更后必须 rebuild
docker compose up -d --force-recreate
```

## 4. 架构

```
浏览器 → Nginx /gitstars/ → 容器:8091 (host 网络)
                              ├─ 静态 dist
                              ├─ POST /api/oauth/access_token
                              ├─ /api/github/*      → mihomo 127.0.0.1:17890 → api.github.com
                              └─ /api/github-raw/*  → mihomo → raw.githubusercontent.com
```

- **host 网络**：mihomo 仅监听 `127.0.0.1:17890`，桥接网络容器无法访问，故 compose 使用 `network_mode: host` + `SERVER_PORT=8091`。
- 前端 GitHub 请求走 `${BASE_URL}api/github`，不直连 `api.github.com`。
- OAuth 授权跳转仍由浏览器直连 `github.com`（无法代理）。

## 5. vps_nginx

`/gitstars/` → rewrite 去前缀 → `127.0.0.1:8091`（`proxy_pass` **有**尾斜杠）。公网暴露加入 `VPS_NGINX_PUBLIC_EXPOSE=...,gitstars`。

## 6. 验证

```bash
curl --noproxy "*" -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8091/api/github/zen
curl --noproxy "*" -s -o /dev/null -w "%{http_code}\n" https://xiaolitongxue.com.cn/gitstars/
```

期望均为 200。浏览器 **Ctrl+Shift+R** 强制刷新后再登录。

## 7. 代理环境变量（可选覆盖）

```yaml
# docker/compose.yml 默认
HTTP_PROXY: http://127.0.0.1:17890
HTTPS_PROXY: http://127.0.0.1:17890
```
