#!/usr/bin/env bash
# 最小 loopback smoke：compose 语法 + 若 :8091 已监听则 curl。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if command -v docker >/dev/null 2>&1 && [[ -f docker/compose.yml ]]; then
  if [[ -f docker/.env ]]; then
    docker compose -f docker/compose.yml config >/dev/null
    echo "compose config OK"
  else
    echo "compose config skipped (docker/.env missing)"
  fi
fi
if curl --noproxy '*' -sS -o /dev/null -w '%{http_code}' --connect-timeout 2 http://127.0.0.1:8091/gitstars/ 2>/dev/null | grep -qE '^[234]'; then
  echo "8091 reachable"
else
  echo "8091 not listening (skip live probe)"
fi
