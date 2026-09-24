# gitstars — Agent 入口

自托管 GitHub Stars。部署细节：[docker/DEPLOY.md](docker/DEPLOY.md)、[PROJECT_MEMORY.md](PROJECT_MEMORY.md)。

## 契约

- 人用 URL：`/gitstars/`
- 容器 **host 网络**、`SERVER_PORT=8091`，才能打到宿主机 mihomo `127.0.0.1:17890`
- 构建：`VITE_BASE_PATH=/gitstars/`
- vps_nginx：`proxy_pass` **有**尾部 `/`（与 blog 相反）

## 路径

- 本机：`Code/VPS/gitstars`
- 生产：`/home/ubuntu/Code/VPS/gitstars`

## 部署（生产唯一入口）

```bash
cd docker
COMPOSE_IGNORE_ORPHANS=true docker compose up -d --no-build
# Dockerfile / server.js / Client ID 变了才 compose build
# 回滚：上一 docker-gitstars 镜像；不要 bootstrap
```

## 测试

- **single**：`bash scripts/smoke-local.sh`（探 upstream 路径，不要再探一层 `/gitstars/`）
- **related**：生产 Tailscale `/gitstars/`（要 mihomo `:17890` + vps_nginx）

## 硬约束

- 勿提交 `docker/.env`、OAuth Secret、`cert/*.key`。
- 探针 `curl --noproxy '*'`。
- 业务出站只认 **17890**，不要改到 danted 17891。
- host 网络只听 `127.0.0.1:8091`。禁止 `compose down -v`。
