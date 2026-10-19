# 01 总体架构

> 一条主循环：**写 → 存 → 发布 → 触发构建 → 静态上线。**

---

## 1. 架构图

```
                    ┌──────────────────────────────────────┐
   访客 ──────────→ │   Nginx (80/443) + certbot 自动续期   │
                    └──────┬────────────────────┬──────────┘
                           │                    │
       静态文件（≈95%）     │                    │ /api/v1/**  /media/**
                           ▼                    ▼
             ┌──────────────────────┐  ┌────────────────────────────┐
             │ Next.js 静态导出产物  │  │  Kotlin 单体                │
             │ 纯 HTML/CSS/JS       │  │  Spring Boot 3.4.5 + JDK 21 │
             │ 服务器零渲染开销      │  │  /api/v1   /admin/api       │
             └──────────────────────┘  │  后台 UI 另行静态托管        │
                           ▲           └──┬────────┬────────┬────────┘
                           │              │        │        │
                           │        PostgreSQL 16  Redis 7  Elasticsearch 8
                           │        业务数据+兜底   会话/计数  IK 分词 + BM25
                           │                        /限流     + dense_vector kNN
                           │
        ┌──────────────────┴───────────────────────────────┐
        │   GitHub Actions（构建在云端，不吃服务器资源）      │
        │   next build（output: 'export'）                  │
        │   ← fetch  https://<domain>/api/v1/export         │
        └──────────────────▲───────────────────────────────┘
                           │  repository_dispatch
                     （发布后防抖触发，30s 合并窗口）
```

> **ES 路线下不需要 pgvector。** 向量存在 ES 的 `dense_vector` 字段里，中文分词交给 IK。这一下省掉了一个 PG 扩展、一张向量表、以及"PG 与 ES 两份向量"的一致性负担。

---

## 2. 部署单元

| 单元 | 关键配置 | 端口 |
|------|---------|------|
| **app** | Kotlin 2.1 + Spring Boot 3.4.5 | 8080 |
| **postgres** | PG 16，`shared_buffers=256MB` | 5432 |
| **elasticsearch** | ES 8.x，单节点 0 副本 | 9200 |
| **redis** | Redis 7 | 6379 |
| **minio** | MinIO 单节点（图床），控制台 9001 | 9000 |
| **nginx** | Nginx + certbot | 80 / 443 |
| **static** | Next.js 导出产物（Nginx 直发） | — |

### ES 内存必须做

```yaml
environment:
  - "ES_JAVA_OPTS=-Xms512m -Xmx512m"     # 1. 堆卡死，不许自适应
  - "discovery.type=single-node"          # 2. 单节点模式
  - "xpack.security.enabled=false"        # 3. 内网不启安全模块，省堆
  - "xpack.ml.enabled=false"              # 4. 关掉机器学习模块
  - "bootstrap.memory_lock=false"         # 5. 容器内不锁内存
```
```json
// 索引设置：单节点下副本纯属浪费
{ "index": { "number_of_replicas": 0, "refresh_interval": "5s" } }
```

**上线后再 `docker stats` 实测 RSS **

---

## 3. 技术选型与理由

| 领域 | 选型 | 为什么不选别的 |
|------|------|---------------|
| 语言 / 框架 | Kotlin 2.1 + Spring Boot 3.4.5 + JDK 21 | 不用 WebFlux：博客 IO 模型简单，响应式是纯负担且难调试 |
| 业务数据库 | PostgreSQL 16 | 业务数据唯一存储；`pg_trgm` 作 ES 的降级兜底 |
| 检索 | **Elasticsearch 8.x**（IK 分词 + BM25 + `dense_vector` kNN） | ES 是主检索。选它是因为**要做 BM25 + 向量混合检索**，不是因为它"更高级" |
| 检索降级 | PG `pg_trgm` 模糊匹配 | ES 挂掉时不至于搜索完全不可用 |
| 缓存 / 会话 / 计数 | Redis 7 | 会话可即时吊销；阅读量先落 Redis 再定期聚合落库 |
| 中文分词 | ES `analysis-ik` 插件 | 成熟、词典可配置；**不再需要应用层 jieba** |
| 向量检索 | ES `dense_vector` + HNSW | 不用 pgvector：ES 已承担检索，**避免两份向量的一致性负担** |
| Embedding | bge-m3 API（免费额度） | 不在服务器上跑推理 |
| LLM | DeepSeek | 便宜好用 |
| 前端 | **Next.js（App Router）+ `output: 'export'`** + Tailwind + shadcn/ui | 生态最常见、炫酷组件库最全；静态导出保证零常驻开销 |
| 反向代理 | **Nginx + certbot** | 好用 |
| 图片处理 | **JDK `ImageIO` + `Graphics2D`**（应用内多尺寸缩略图） | 不引第三方库。自己写：先读尺寸、再决定要不要解码见 §7.3 |
| 对象存储 / 图床 | **MinIO 自建**（`shared/storage`） | 图片不进应用服务器磁盘。代价约 +200MB 内存，已认账 |
| 编排 | Docker Compose（+ `es` profile） | 单机 |
| CI/CD | GitHub Actions → 阿里云 ACR 镜像 → SSH 部署；后台与公开站由 Nginx 直发静态产物 | 不在服务器上构建 |
| 可观测 | Actuator + Micrometer + JSON 结构化日志 | 不上 Prometheus / Grafana：内存已经紧，先靠 Actuator + 日志 + 内存告警 |

---

## 4. 数据流

### 4.1 主流程：发文 → 上线

```
管理后台（自动保存每 30s）
  └─→ PATCH /admin/api/posts/{id}   只写「工作副本」，不碰线上，不触发构建
                                        ↓
                                点「发布」/「更新线上」
                                        ↓
  ┌─────────────────────────────────────────────────────────┐
  │ 单事务：                                                 │
  │   1. 渲染 Markdown → HTML                                │
  │   2. UPSERT post_publications（标题/摘要/HTML/标签/封面） │
  │   3. posts.last_published_at = now()                     │
  │   4. INSERT site_builds(status = PENDING)                │
  └─────────────────────────────────────────────────────────┘
                                        ↓
  事务提交后（异步，失败不影响发布成功）：
   a. 推 ES 索引 → 失败则 es_sync_status = FAILED，等补偿任务
   b. 定时任务（每 10s）：有 PENDING 且距上次 FIRED > 30s
      → 合并所有 PENDING 成一次 GitHub repository_dispatch

GitHub Actions:
   4. next build，构建时 fetch https://<domain>/api/v1/export
   5. rsync 静态产物到服务器 → 立即生效

访客: Nginx 直接发静态文件
```

**静态站与 ES 都只读 `post_publications`**，两者天然一致。工作副本里未发布的内容永不泄漏到线上。

**为什么 CI 走公网 API 而不是直连数据库**：API 是内容的唯一出口；而且不需要给 CI 开数据库权限。

### 4.2 搜索

```
                          ┌──── 主路径 ────→ Elasticsearch
                          │                  index: posts / notes
访客 → GET /api/v1/search │                  IK 分词 + BM25（第二阶段加 kNN）
                          │
                          └──── 降级 ──────→ PostgreSQL pg_trgm
                                             ES 不可用时自动切换
                                             响应标注 degraded: true
```

搜索走服务端而不是前端静态索引，原因：**这一层就是 RAG 的检索层，一份代码两个用途。**

### 4.3 图片上传

```
后台选图 → POST /admin/api/assets (multipart)
  1. 校验：MIME 白名单 + 大小 ≤ 5MB + 真实图片头校验（防改后缀）
  2. 生成对象名 2026/09/{uuid}.{ext}
       —— 按年月分目录；用 UUID 而不是原始文件名（用户输入永不参与路径拼装）
  3. MinIO putObject → bucket: blog-media
  4. 返回 { url, thumbnails }
       url = {publicBaseUrl}/2026/09/{uuid}.{ext}
访客 → Nginx /media/** → proxy_pass http://minio:9000/blog-media/
```

**图片不落在应用服务器上**，只存在 MinIO。这带来三件事：

- 应用服务器磁盘不用为图片预留空间；扩图片只需扩 MinIO
- Nginx 反代 `/media/**` 到 MinIO，**HTTPS / 缓存 / 限流都在 Nginx 层**，MinIO 只管存
- bucket 是**公开只读**（匿名 `s3:GetObject`）：图片必须能不经鉴权、**永久**访问 ——
  预签名 URL 会过期，不适合博客

**降级？不降级 —— 连不上就直接不让应用起来。**

`shared/startup/InfrastructureInitializer` 在启动时自检 Redis 与对象存储，任一不可用就抛
`IllegalStateException` 终止启动。理由见 §5 的判据：**图片是核心功能，登录也是**。

### 4.4 阅读量打点

```
文章页 JS → POST /api/v1/views {type, id}
  Redis: SET view:{type}:{id}:{ipHash} NX EX 3600   ← 同 IP 一小时一次
         INCR view:count:{type}:{id}
  定时任务每 5 分钟：增量 → daily_views + posts.view_count，然后 DECRBY 归零
```

**阅读量绝不进静态 HTML**，否则每次有人读文章都要重建站。前端 JS 动态获取。

### 4.5 认证

单管理员账号。密码 **BCrypt(cost=12)** 哈希；会话存 Redis（HttpOnly + SameSite=Strict Cookie）配 CSRF token。**不做 JWT、不做 RBAC。**

### 4.6 后台实时预览

```
编辑器里改动 → POST /admin/api/posts/{id}/preview  { contentMd }
  app: 用同一个 MarkdownRenderer 渲染 → 返回 { html, wordCount, readingMinutes }
  前端: 分栏实时显示
  不写库、不碰发布快照、不触发构建
```

---

## 5. 降级行为

| 故障                     | 影响                                  | 设计保证                                               |
| ---------------------- | ----------------------------------- | -------------------------------------------------- |
| app 挂了                 | 已上线静态站照常访问                          | 静态文件由 Nginx 直发                                     |
| **ES 挂了**              | 搜索质量下降                              | **自动降级到 PG `pg_trgm`，搜索仍可用，响应标注 `degraded: true`** |
| **Redis 挂了**           | 启动时：**应用启动失败**；运行中挂掉：后台登录失效、阅读量暂停累加 | fail fast —— 没有它登录不了，只有作者能用的后台"核心功能"就不成立           |
| **MinIO 挂了**           | 启动时：**应用启动失败**；运行中挂掉：图片上传返回 503     | fail fast —— 静默降级只会让"以为发出去了、结果图全挂"事后才发现            |
| LLM / Embedding API 挂了 | AI 功能不可用                            | 发文、搜索、留言全部不受影响                                     |
| CI 构建失败                | 已上线内容不变                             | 后台显示"构建失败"+ Actions 链接                             |
| 图片处理积压                 | 上传变慢                                | 缩略图同步生成 + 信号量限并发 2（见 §7.3）                         |
| **内存逼近上限**             | —                                   | 内存告警；必要时停 ES（搜索降级但不致命）                             |

### 判据：**核心依赖 fail fast，可选增强才降级**

**没有它，这个系统的核心功能还成立吗？**

| 依赖              | 没有它会怎样                       | 处理                           |
| --------------- | ---------------------------- | ---------------------------- |
| PostgreSQL      | 没有任何内容可读可写                   | fail fast（DataSource 本来就连不上） |
| Redis           | 登录不了 —— 对只有作者能用的后台来说，核心功能不成立 | fail fast（启动期自检）             |
| **MinIO**       | 发不了带图的文章                     | **fail fast（启动期自检）**         |
| ES              | 还有 PG `pg_trgm` 兜底，搜索"变差但成立" | 降级（刻意的双路径设计）                 |
| LLM / Embedding | 只是增强，博客的核心是内容                | 降级                           |

---

## 6. 关键取舍记录

| 决定 | 理由 |
|------|------|
| 用 ES 而不是 PG 全文检索 | 为了做 BM25 + 向量混合检索，想练手 |
| ES 路线下砍掉 pgvector | 向量存 ES `dense_vector`，省一个扩展 + 一张表 + 一份一致性负担 |
| 检索层保留 PG 降级 | 依赖挂了站要能读，这是定下的原则 |
| 不做 CQRS | 读多写少但没有跨进程需求，读写同库足够 |
| 不做 MQ | 异步需求（图片处理、构建触发、ES 补偿）用「DB 状态表 + 定时任务」就够，天然幂等可重试 |
| 构建放 CI | 2 核服务器编译前端会 OOM |
| 前端静态化 | 省 300–500MB 内存 + SEO 完美 |
| **静态生成而非后端渲染 / SPA** | 见 §7.2：博客"写一次读一万次"，把成本从读路径挪到写路径 |
| **单模块分包而非 Gradle 多模块** | 见 §7.1：多模块买的是"编译器守边界"，一个人时用不上，却放大"改主意"的成本 |
| **业务侧零自造接口** | 没有第二个实现时，抽象就是负债；现有的 interface 全是 MyBatis 的 Mapper（框架要求）。见 §7.1.3 |
| **图片处理用 JDK ImageIO** | 见 §7.3 |
| **缩略图同步生成，不是异步** | 见 §7.3 |
| **后台实时预览** | 静态方案的发布延迟由预览补偿。见 §4.6 |
| **图床用自建 MinIO** | 见 §7.5：解耦图片与应用的存储；代价约 +200MB 内存 |
| **`shared/storage` 不抽接口** | 当前只有 MinIO 一个实现。按 §7.1.3 的纪律，没有第二个实现时抽象是负债 |
| **bucket 公开只读** | 图片必须能不经鉴权、**永久**访问；预签名 URL 会过期，不适合博客 |
| `post_publications` 快照表 | 见 `04-domain-rules.md` §2 |

---

## 7. 几个决策

### 7.1 为什么是单模块分包，而不是 Gradle 多模块

**多模块有的是**：编译期强制的依赖边界（越界 = 编译失败）。

**代价是**：每个模块一份 build 文件、依赖声明分散、IDE 同步与构建更慢，而且**改边界的成本从「IDE 里拖个包」变成「改 5 个文件」**。

**为什么这里不划算**：

1. 多模块真正的价值场景是「多人协作 / 独立发布 / 强制防止越界」。**前两条现在都不成立** —— 只有一个开发者时，没人会去违反那条边界。
2. 它是**可逆决策**。技术决策里最该花时间的是**不可逆**的（数据库、语言、部署形态 —— 选错要重写），可逆的应该快速决定然后往前走。Gradle 里按包拆模块是机械操作：建目录、搬文件、改 6 行 `settings.gradle.kts`、加 project 依赖，半天的事。

**什么时候该拆**：

- 第二个开发者加入，需要编译器守边界
- 纯编译时间超过 30 秒
- 某个模块要独立部署
- 某个模块要单独发版本

#### 7.1.1 架构形态叫什么

**Package-by-Feature 的模块化单体（Modular Monolith）**，带一点 Shared Kernel（`shared` 包），只在真正需要替换的地方用 Ports & Adapters。

一个进程、一个部署单元，但代码按**业务能力**分包：

```
post  note  comment  media  taxonomy  metrics  export  sitebuild  admin  shared  schedule
```

包内再分 `web / service / repository / domain`。

**和"分层单体"的区别**：分层单体是 `controller` 一个包、`service` 一个包、`repository` 一个包 —— **改一个功能要在 4 个包之间来回跳**。按功能分包则是**改一个功能只在一个目录里工作**：加"文章置顶"只动 `post/`。

#### 7.1.2 为什么不上完整六边形 / DDD 战术模式

> 六边形的收益是「领域逻辑独立于基础设施，可替换、可纯单元测试」。
>
> 我们领域逻辑稀缺，强行套上 `domain / application / adapter / infrastructure` 四层加一堆 mapper，是负收益。
>

**一个可复用的判断信号**：如果某个 service 里出现了「需要 mock 5 个依赖才能测的业务规则」，那就是该把领域逻辑抽出来的时候。本项目所有 service 都是**编排**（取数据 → 判状态 → 写库 → 发事件），不是**计算**。

#### 7.1.3 抽象纪律

**业务侧一个自造接口都没有**。仓库里能看到的 interface 全是 MyBatis 的 Mapper ——
框架要求声明成 interface 才能生成代理，那是被逼的，不是设计。

> **没有第二个实现的时候，接口就是负债** —— 多一个文件、多一次跳转、改个参数要动两处。

- `MarkdownRenderer` 是具体类，直接依赖：设计初稿里写的「占位版 + 将来接 commonmark 两个实现」没有出现
- `SearchPort` 会有接口：真的有 ES 与 PG 降级两个实现
- **其他一律直接依赖**

这条纪律能长期防止"为了解耦而解耦"—— 个人项目里最常见的过度设计。

### 7.2 为什么静态生成，而不是后端渲染 / SPA

先纠正一个前提：**不是"每次发文章都构建"，是"每次发布构建"。**

不触发构建的（完整规则见 `04-domain-rules.md` §11）：**自动保存**（每 30 秒一次）、私密内容的任何改动、**评论审核**、**标签改名**、阅读量变化。而且有 **30 秒防抖** —— 一次改 5 篇只构建一次。

**关键事实：构建不在你的服务器上。** `next build` 跑在 GitHub Actions，2H4G 只负责拿到 rsync 过来的静态文件。所以构建对服务器的成本是 **0**。

三种方案摆一起：

|         | **A. 静态生成（现状）** | **B. 后端模板渲染** | **C. SPA + API** |
| ------- | --------------- | ------------- | ---------------- |
| 访客请求落到  | Nginx 发文件       | JVM 渲染 HTML   | JVM 返 JSON，浏览器渲染 |
| 后端挂了    | **站照常读**        | 站全挂           | 站全挂              |
| SEO     | 完美              | 完美            | 差                |
| 首屏      | 最快              | 快             | 最慢（JS + N 次 API） |
| 服务器 CPU | ≈ 0             | 每请求都占用        | 每请求 + 多次 API     |
| 免费 CDN  | **直接挂**         | 难             | 难                |
| 发布延迟    | 2–3 分钟          | 立即            | 立即               |
| 工程量     | 最高              | **最低**        | 中                |
| 2H4G 适配 | 最好              | 可以            | 勉强               |

> **博客是"写一次、读一万次"。写路径的延迟不敏感，读路径的成本敏感。**

静态化把"读"的成本压到接近零，同时：

- **后端全挂时站仍可读** —— 2H4G 单机上 PG 重启、OOM、升级都会发生，这不是理论风险
- **免费 CDN** —— 挂 Cloudflare 就是全球加速，零成本零配置；动态站挂 CDN 要处理缓存失效

**关于全量构建**：现在是全量，而且是刻意的。几十到一两百篇时，Next.js 全量 SSG 约 20–60 秒，跑在 CI 上。增量构建（ISR）需要**常驻 Node server**。真正该做的优化不是"增量"而是**分级**（内容页增量、索引页全量），**触发条件是全量构建超过 3–5 分钟**，约对应 500–1000 篇。

**"静态"不等于"没有后端交互"**，边界见 `07-frontend.md` §5。判断标准只有一条：**作者写的东西进 HTML，读者写的东西走接口** —— 文章、短动态进 HTML（换来 SEO 与最快首屏），评论、阅读量、搜索、AI 一律走客户端。

### 7.3 图片处理为什么用 JDK ImageIO

原计划用 Thumbnailator。实现时改成只用 JDK 的 `ImageIO` + `Graphics2D`，理由不是省依赖，而是：一张 50000×50000 的 PNG 压缩后可能只有几百 KB，但在 2H4G 上解码就是几个 GB。`ImageProcessor.decode` 的三步顺序是固定的：① 只读头部拿尺寸 → ② 像素数 / 格式 / 完整性校验 → ③ 才真正解码。

另外**缩略图生成改成同步的**：单作者场景并发上传几乎不存在，异步的复杂度换不到任何东西；同步返回还能让响应直接带上缩略图地址，前端不用轮询。

### 7.5 图床为什么最终选了自建 MinIO

**选 MinIO 的核心理由是"解耦"而不是"性能"**：图片不占应用服务器的磁盘，也不进它的备份窗口。
而且 `shared/storage` 这一层走的是 S3 协议 —— 将来迁到 OSS，改配置 + 换一个实现即可。

