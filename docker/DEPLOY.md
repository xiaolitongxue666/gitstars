# Gitstars VPS 部署说明

## 1. 创建 GitHub OAuth App

1. 打开 https://github.com/settings/applications/new
2. 填写：
   - **Application name**: `Gitstars (VPS)`
   - **Homepage URL**: `https://xiaolitongxue.com.cn/gitstars/`
   - **Authorization callback URL**: `https://xiaolitongxue.com.cn/gitstars/`
3. 点击 **Register application**
4. 复制 **Client ID**，点击 **Generate a new client secret** 生成并保存 **Client Secret**（只显示一次）

## 2. 写入 VPS 环境变量

SSH 到 VPS 后编辑 `~/Code/Web/gitstars/docker/.env`：

```env
VITE_GITSTARS_CLIENT_ID=你的ClientID
VITE_GITSTARS_CLIENT_SECRET=你的ClientSecret
```

**重要：** `.env` 必须使用 **Unix 换行（LF）**。Windows 编辑器保存的 CRLF 会导致 Secret 末尾带 `\r`，OAuth 换 token 失败。可在 VPS 上执行：

```bash
sed -i 's/\r$//' ~/Code/Web/gitstars/docker/.env
```

## 3. 构建并启动

Client ID 在 `vite build` 时写入前端 JS，修改后必须 rebuild：

```bash
cd ~/Code/Web/gitstars/docker
docker compose build --no-cache   # 代码变更后建议 --no-cache，避免 dist 层缓存
docker compose up -d --force-recreate
```

仅修改 Secret 时，重启即可：

```bash
docker compose up -d --force-recreate
```

`docker compose up --force-recreate` 会先停止旧容器（默认等待约 10 秒），期间可能看似无输出，属正常现象。

## 4. vps_nginx 子路由

在 `vps_nginx` 中新增 `/gitstars/` location（参考 feynflow），upstream 指向 `127.0.0.1:8091`，并加入 `VPS_NGINX_PUBLIC_EXPOSE`（若需公网访问）。

## 5. 验证

VPS 若配置了系统 HTTP 代理，curl 需加 `--noproxy "*"`：

```bash
curl --noproxy "*" -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8091/
curl --noproxy "*" -s -o /dev/null -w "%{http_code}\n" https://xiaolitongxue.com.cn/gitstars/
curl --noproxy "*" -s -X POST http://127.0.0.1:8091/api/oauth/access_token \
  -H "Content-Type: application/json" \
  -d '{"code":"test","client_id":"YOUR_CLIENT_ID"}'
# 期望: {"error":"bad_verification_code",...} 而非 404
```

浏览器访问 https://xiaolitongxue.com.cn/gitstars/ ，强制刷新（Ctrl+Shift+R）后点击 GitHub 登录。

## 6. 代理（可选）

| 流量 | 路径 | VPS 代理是否有用 |
|------|------|------------------|
| OAuth 换 token | 容器 → github.com | 可选（仅影响登录） |
| Star 列表 / Ranking | 浏览器 → api.github.com / raw.githubusercontent.com | **否** |

容器仅需在 OAuth 直连不稳时配置代理，示例（宿主机 mihomo `127.0.0.1:17890`）：

```yaml
# docker/compose.yml 片段
extra_hosts:
  - "host.docker.internal:host-gateway"
environment:
  HTTP_PROXY: http://host.docker.internal:17890
  HTTPS_PROXY: http://host.docker.internal:17890
```

容器内不可使用 `127.0.0.1:17890`（指向容器自身）。

## 架构

- Nginx：`/gitstars/` → rewrite 去前缀 → `127.0.0.1:8091`
- 容器：Express 静态托管 + `POST /api/oauth/access_token`
- 前端：`base: '/gitstars/'`，axios `baseURL` 与 OAuth `redirect_uri` 均含子路径
