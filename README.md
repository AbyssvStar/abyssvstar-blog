# abyssvstar-blog

个人技术博客。**以数据库为内容源**，发布后重建静态站。

线上：**https://abyssvstar.cloud**

写、预览、发布都在自己的后台里完成；发布后自动触发构建，静态站随之更新。

---

## 这是什么

一个只给一个人用的博客，跑在一台 2C4G 的服务器上。所以很多东西是**刻意不做**的：

- 没有多用户、注册、RBAC —— 只有我一个作者
- 没有消息队列 —— 用「DB 状态表 + 定时任务」代替，没有跨进程事件的需求
- 没有 CQRS / 分库分表 / 分布式锁 —— 领域逻辑很薄，读写同库足够

取而代之的是几条能真正解决问题的小设计，见下一节。

## 技术栈

| 层 | 选型 |
|---|---|
| 后端 | Kotlin 2.1 / Spring Boot 3.4 / JDK 21，**按功能分包的单体**（9 个模块） |
| 持久层 | PostgreSQL 16 + MyBatis-Plus，Flyway 管理 13 个迁移 |
| 缓存 / 会话 | Redis |
| 对象存储 | 自建 MinIO 图床 |
| 搜索 | Elasticsearch 8（IK 分词 + `dense_vector`）→ **PG `pg_trgm` 降级** |
| 公开站 | Next.js 静态导出 + Tailwind，构建期用 Shiki 做代码高亮 |
| 后台 | Vite + React + TypeScript，浅色 / 深色双主题 |
| 部署 | 单机 Docker Compose + Nginx，GitHub Actions 三条流水线 |

## 几个设计决定

**1. 内容在库里，站点是产物。**
发布时把工作副本写成一条不可变的 `post_publications` 快照，静态站只从快照读。
好处是工作副本怎么改都不会波及线上；代价是发布有延迟，所以后台配了实时预览来补偿。

**2. 「对外可见」的判定只有一处。**
`PublishedContentSpec` 是唯一真源，所有查公开内容的代码都经过它。
私密文章和归档文章的边界一旦散落在多处，泄漏只是时间问题。
专门的坑：`/api/v1/export` **不能**直接扫 `post_publications`，归档文章的旧快照还在表里。

**3. 核心依赖 fail fast，可选增强才降级。**
判据是「没有它，系统的核心功能还成立吗？」。PG / Redis / MinIO 挂了就直接不启动；
ES 挂了搜索降级到 PostgreSQL，仍然返回 HTTP 200 + `degraded: true`；AI服务挂了降级到停止AI服务。

**4. 作者写的东西进 HTML，读者写的东西走接口。**
文章内容是构建期的，构建一次服务所有读者；搜索、留言这些取决于读者的行为，只能走接口。

## 目录

```
src/main/kotlin/com/abyssvstar/blog/
├── admin/        登录、会话、CSRF
├── post/         文章、发布快照、乐观锁、排期
├── taxonomy/     标签
├── media/        图床
├── search/       ES 索引与查询、降级
├── export/       全量导出（静态站的唯一数据源）
├── sitebuild/    构建状态与防抖触发
├── siteconfig/   站点配置
└── shared/       Markdown、限流、审计字段、可见性判定

frontend/
├── site/         Next.js 静态站
└── admin/        Vite + React 后台

docs/             设计文档
```

## 本地跑起来

**前置**：JDK 21、Docker Desktop、Node 20.19+（Vite 8 的硬性要求，`next` 要 20.9+）。

```bash
# 1. 准备配置
cp .env.example .env
# 改掉四项必填：POSTGRES_PASSWORD / MINIO_ROOT_USER / MINIO_ROOT_PASSWORD / BLOG_ADMIN_PASSWORD

# 2. 起后端（PG + Redis + MinIO + app）
docker compose up -d --build app
docker compose ps                       # app 应为 healthy
curl http://127.0.0.1:8080/actuator/health/readiness

# 3. 起后台
cd frontend/admin && npm install && npm run dev
# 打开 http://127.0.0.1:5173，用 .env 里的 BLOG_ADMIN_PASSWORD 登录

# 4. 起公开站（可选）
cd frontend/site && npm install
# 构建期变量放 frontend/site/.env.local：SITE_URL / EXPORT_URL / EXPORT_TOKEN
npm run dev                             # http://127.0.0.1:5174
```

搜索是可选的。要启用 ES：`docker compose --profile es up -d elasticsearch`（需要宿主机
`vm.max_map_count >= 262144`）；不起 ES 时搜索会自动降级到 PostgreSQL，功能仍然可用。

## 状态

已上线，完成到 G4（搜索 + ES 降级）。接下来是AI服务与留言板。
完整的阶段门定义见 [03-roadmap](docs/03-roadmap.md)。
