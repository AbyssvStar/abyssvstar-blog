# 08 部署、运维与安全（施工图）（暂定）

---

## 1. 部署拓扑

单机 Docker Compose，Nginx 在最前面。

### 1.1 域名与路径分流

```
abyssvstar.cloud
├── /                    → 静态产物目录 /srv/blog/static
├── /_next/**            → 同上（Next.js 资源）
├── /media/**            → proxy_pass → minio:9000/blog-media/（图片，见 `01` §4.3）
├── /api/v1/**           → proxy_pass → app:8080
├── /admin/api/**        → proxy_pass → app:8080
├── /admin/**            → proxy_pass → app:8080（后台 UI 资源）
└── /actuator/**         → allow 127.0.0.1; deny all
```

> **前端与后端同域名同源 → 完全不需要 CORS 配置**，也没有跨域 Cookie 问题。这是最省事也最安全的方案。

---

## 2. CI/CD 契约

代码侧保证以下契约，按它写 workflow：

### 2.1 应用镜像

| 项 | 约定 |
|---|---|
| 镜像名 | 阿里云 ACR 个人版：`<ACR_REGISTRY>/<ACR_NAMESPACE>/abyssvstar-blog-app`（例 `registry.cn-shanghai.aliyuncs.com/abyssvstar/...`） |
| 为什么不用 GHCR | 服务器在**腾讯云境内**，拉到 ghcr.io 那一跳经常只有几十 KB/s 甚至超时；ACR 是境内互通，通常几秒 |
| 标签 | `latest` + git short sha |
| 基础镜像 | 构建 `eclipse-temurin:21-jdk` → 运行 `eclipse-temurin:21-jre-alpine` |
| 产物 | `build/libs/app.jar`（`bootJar` 已固定文件名） |
| 端口 | 8080 |
| 健康检查 | `GET /actuator/health/readiness` → 200 |
| JVM 参数 | `-Xmx512m -XX:MaxMetaspaceSize=160m -XX:+UseSerialGC` |

> `-XX:+UseSerialGC` 是刻意的：512MB 堆 + 2 核，Serial GC 的 GC 开销比 G1 更低，也没有并行线程抢占 CPU。

### 2.2 静态产物

| 项 | 约定 |
|---|---|
| 构建 | `next build`（`output: 'export'`）→ `out/` |
| 部署目标 | 服务器 `/srv/blog/static/` |
| 方式 | `rsync -az --delete` |
| 触发 | `repository_dispatch`（类型 `site-rebuild`） |
| 兜底 | 定时任务每 30 分钟跑一次（带 `If-None-Match`，未变更时 304 直接结束） |

> ⚠️ **`--delete` 必须带**。不带它，你删掉一篇文章后线上 HTML 还在。
>
> ⚠️ **定时兜底也必须做**。`repository_dispatch` 会因为网络抖动或 GitHub 限流丢掉，有了 ETag，这个兜底几乎零成本。

### 2.3 需要的 Secrets

| Secret | 用途 |
|---|---|
| `EXPORT_TOKEN` | 调 `/api/v1/export`（同时是服务端的 `BLOG_EXPORT_TOKEN`） |
| `SSH_HOST` / `SSH_USER` / `SSH_KEY` | rsync 部署静态产物 |
| `ACR_USERNAME` / `ACR_PASSWORD` | 推镜像到阿里云 ACR（密码是"容器镜像服务"里设的固定密码，不是登录密码） |
| `ACR_REGISTRY` / `ACR_NAMESPACE`（Variables） | 用于推送镜像                                                 |
| `FEISHU_WEBHOOK` | 构建失败告警 |

### 2.4 三条流水线

```
[应用镜像]  push to main（src/** 或 build.gradle.kts 变更）
  → ./gradlew test build
  → docker build -t <ACR_REGISTRY>/<ACR_NAMESPACE>/abyssvstar-blog-app:<sha>
  → docker push
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

| 指标 | 来源 |
|---|---|
| 内存 / 磁盘 / 容器状态 | `docker stats` + `df -h`（shell 脚本，每 5 分钟） |
| 应用健康 | Actuator `/actuator/health/readiness` |
| JVM | Actuator `/actuator/metrics`（堆、GC、线程） |
| 业务 | `site_builds` 失败数、`es_sync_status = 'FAILED'` 数、AI 月成本 |

> **刻意不上 Prometheus + Grafana**：那一套至少吃 300MB 内存

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

## 6. 安全清单

| 项 | 做法 |
|---|---|
| 密码哈希 | **BCrypt，cost = 12**（见下方说明） |
| 登录防爆破 | 同 IP 连续 5 次失败 → 锁 15 分钟 |
| 会话 | HttpOnly + Secure + SameSite=Strict；存 Redis 可即时吊销 |
| CSRF | 非 GET 的 `/admin/api/**` 强制校验 `X-CSRF-Token`（登录端点豁免，见下） |
| **XSS** | 正文**允许**原始 HTML —— 只有作者能写，禁掉只会加写作摩擦；代价是**任何公开写入入口（评论、投稿、AI 回写正文）落地前，渲染必须先加消毒**。留言内容一律转义 |
| 上传 | MIME 白名单 + ≤ 5MB + **读真实图片头校验**（防改后缀）+ 文件名丢弃重命名 |
| 路径穿越 | 上传路径由服务端拼装，用户输入只用于扩展名白名单校验 |
| SQL 注入 | 全部走参数化查询（MyBatis-Plus 的 `#{}` 预编译参数），不拼 SQL |
| CORS | **不需要**（同源部署） |
| 依赖漏洞 | Dependabot + 每月 `./gradlew dependencyUpdates` |
| 备份加密 | 出本机前 GPG 加密 |

### 为什么用 BCrypt 而不是 Argon2id

设计初稿写的是 Argon2id。实现时改为 **BCrypt(cost=12)**，理由：

- Spring Security 的 `Argon2PasswordEncoder` **依赖 BouncyCastle**（`bcprov-jdk18on`）。为单一管理员账号在 2H4G 的机器上多引一个加密库，收益极低。
- OWASP 的密码存储推荐顺序是 Argon2id > scrypt > **bcrypt** > PBKDF2。**bcrypt cost=12 仍在可接受范围内**，也是 Spring 生态最成熟的默认。
- 将来要换 Argon2id，只需加依赖 + 换一个 `PasswordEncoder` Bean，**密码哈希格式自带前缀**（`$2a$` / `$argon2id$`），支持平滑迁移。

### 为什么登录端点豁免 CSRF

`/admin/api/auth/login` 是唯一在**会话建立之前**调用的写接口，此时没有 CSRF token 可比对。风险很低：Cookie 是 `SameSite=Strict`，跨站请求根本带不上；"强制登录"对单用户博客没有攻击价值。**其余所有非 GET 的 `/admin/api/**` 一律强制校验。**

### 限流一览

> ⚠️ **每一项的次数和窗口写在代码里的 `@RateLimit` 注解上，紧挨着它保护的接口 —— 那里的注解才是源头。**
> 本表只是**汇总视图**，方便一眼看全。**改限流要改注解，不是改这里。**
>
> 唯一进配置的是总开关 `blog.rate-limit.enabled`（开发/测试要能关掉）。

| 端点 | 限制 | 状态 |
|---|---|---|
| `POST /admin/api/auth/login` | 5 次 / 15 分钟 / IP | ✅ 已实现，`CountOn.FAILURE` |
| `POST /api/v1/comments` | 5 次 / 小时 / IP | G2 |
| `POST /api/v1/views` | 100 次 / 小时 / IP | G4，超出静默丢弃 |
| `GET /api/v1/search` | 30 次 / 分钟 / IP | G4 |
| `POST /admin/api/ai/*` | 20 次 / 小时 | G5，保护 token 预算 |
| `GET /api/v1/export` | 10 次 / 分钟 / Token | G2 |
| 全站 | Nginx `limit_req` 60 次 / 分钟 / IP，突发 20 | G3 |

**两种计次语义**（定义见 `shared/ratelimit/RateLimit.kt`）：

| | 什么时候计数 | 用在哪 |
|---|---|---|
| `CountOn.ATTEMPT` | 每次调用都计数 | "这个接口每 N 分钟最多被调 M 次" |
| `CountOn.FAILURE` | **只在抛异常时计数，成功会清空** | "**连续**失败 N 次就锁" —— 登录用它，否则自己练手连登 6 次就被锁了 |

实现是 `RateLimitAspect`（AOP）。**为什么限流用切面而鉴权用拦截器**：限流需要知道
"这次调用**失败了没有**"，那个信息在拦截器里拿不到 —— 它必须包在方法调用外面。
