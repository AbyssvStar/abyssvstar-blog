# 08 部署、运维与安全

---

## 1. 部署拓扑

单机 Docker Compose，Nginx 在最前面。

### 1.1 域名与路径分流

```
abyssvstar.cloud
├── /                    → 静态产物目录 /srv/blog/static
├── /_next/**            → 同上（Next.js 资源）
├── /media/**            → proxy_pass → minio:9000/blog-media/
├── /api/v1/**           → proxy_pass → app:8080
├── /admin/api/**        → proxy_pass → app:8080
├── /admin/**            → 静态产物目录 /srv/blog/static/admin（后台 Vite 产物）
└── /actuator/**         → allow 127.0.0.1; deny all
```

> **前端与后端同域名同源 → 完全不需要 CORS 配置**，也没有跨域 Cookie 问题。这是最省事也最安全的方案。

---

## 2. CI/CD 契约

代码侧保证以下契约，按它写 workflow：

### 2.1 应用镜像

| 项      | 约定                                                               |
| ------ | ---------------------------------------------------------------- |
| 镜像名    | 阿里云 ACR 个人版：`<ACR_REGISTRY>/<ACR_NAMESPACE>/abyssvstar-blog-app` |
| 镜像仓库   | 阿里云 ACR（GHCR 从境内拉取不稳，已弃用）                                        |
| 标签     | `latest` + git short sha                                         |
| 基础镜像   | 构建 `eclipse-temurin:21-jdk` → 运行 `eclipse-temurin:21-jre-alpine` |
| 产物     | `build/libs/app.jar`（`bootJar` 已固定文件名）                           |
| 端口     | 8080                                                             |
| 健康检查   | `GET /actuator/health/readiness` → 200                           |
| JVM 参数 | `-Xmx512m -XX:MaxMetaspaceSize=160m -XX:+UseSerialGC`            |

> `-XX:+UseSerialGC` 是刻意的：512MB 堆 + 2 核，Serial GC 的 GC 开销比 G1 更低，也没有并行线程抢占 CPU。


### 2.2 三条流水线

```
[CI]        每次 push / pull request
  → 后端 ./gradlew build
  → 后台 npm ci && npm run build

[应用镜像]  push to main（src/** 或 build.gradle.kts 变更）
  → ./gradlew test build
  → docker build -t <ACR_REGISTRY>/<ACR_NAMESPACE>/abyssvstar-blog-app:<sha>
  → docker push
  → rsync 后台外壳到 /srv/blog/static/admin/
  → SSH: docker compose pull app && docker compose up -d app

[静态站]   repository_dispatch: site-rebuild  ／  定时每 30 分钟
  → curl -H "X-Export-Token: $EXPORT_TOKEN" -H "If-None-Match: <etag>" /api/v1/export
  → 304 → 结束
  → next build → rsync -az --delete out/ deploy@host:/srv/blog/static/
```

---

## 3. 备份与恢复

### 3.1 策略

| 对象 | 频率 | 方式 | 保留 |
|---|---|---|---|
| 数据库 | 每天 03:00 | `pg_dump -Fc` → gzip → **GPG 加密** | 本地 7 天 + 异地 30 天 |
| 图片 | 每周日 04:00 | `mc mirror` MinIO → 异地对象存储 | 镜像（保留最新） |
| 配置 | 变更时 | `docker-compose.yml` + `.env`（不含明文密钥） | 私有仓库 |

### 3.2 恢复演练（G7 的通过条件）

**没演练过的备份等于没有备份。** 每季度做一次：

```bash
docker compose stop app
docker compose exec -T postgres dropdb -U blog blog
docker compose exec -T postgres createdb -U blog blog
gunzip -c db-YYYY-MM-DD.dump.gz | gpg --decrypt | \
  docker compose exec -T postgres pg_restore -U blog -d blog --no-owner
docker compose start app
# 验证：后台能登录 / 文章数量对得上 / 图片能打开 / 私密文章还在
```

恢复步骤必须写进文档**并且真的跑一遍**。等到要用时才发现备份是坏的，是最惨的情况。

---

## 4. 监控与告警

### 4.1 采集

| 指标             | 来源                                                     |
| -------------- | ------------------------------------------------------ |
| 内存 / 磁盘 / 容器状态 | `docker stats` + `df -h`（shell 脚本，每 5 分钟）              |
| 应用健康           | Actuator `/actuator/health/readiness`                  |
| JVM            | Actuator `/actuator/metrics`（堆、GC、线程）                  |
| 业务             | `site_builds` 失败数、`es_sync_status = 'FAILED'` 数、AI 月成本 |

> **不上 Prometheus + Grafana**：需要多个镜像和大量内存

### 4.2 告警规则

| 条件 | 级别 |
|---|---|
| 内存使用 > 85%（持续 5 分钟） | 🔴 |
| 磁盘使用 > 85% | 🔴 |
| app 健康检查连续 3 次失败 | 🔴 |
| `site_builds` 连续 2 次 `FAILED` | 🟡 |
| `es_sync_status = 'FAILED'` 超过 10 条 | 🟡 |
| ES 健康检查失败（搜索降级中） | 🟡 |
| AI 月成本 > 预算的 80% | 🟡 |

### 4.3 推送

```bash
curl -s -X POST "$FEISHU_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d "{\"msg_type\":\"text\",\"content\":{\"text\":\"[abyssvstar-blog] $LEVEL $MSG\"}}"
```

脚本里加**静默窗口**：同类告警 30 分钟内只推一次

---

## 5. 日志

| 项 | 策略 |
|---|---|
| 格式 | JSON 结构化（logback + `logstash-logback-encoder`，G7 接入） |
| 字段 | `timestamp` `level` `logger` `message` `traceId` |
| 级别 | 生产 `INFO`；`com.abyssvstar` 默认 `INFO`，可临时调 `DEBUG` |
| 轮转 | Docker `json-file` driver：`max-size=10m`、`max-file=3` |
| **绝不记录** | 密码、会话 ID、原始 IP、**LLM 的完整 prompt**（可能含私密笔记内容） |
| 保留 | 30 天 |

---

