# 05 API 契约与工程规范（施工图）

---

## 1. 路径规范

| 前缀 | 用途 | 鉴权 |
|------|------|------|
| `/api/v1/**` | 公开只读 API（访客用） | 无 |
| `/api/v1/export` | CI 全量导出 | **静态 Token** |
| `/admin/api/**` | 管理后台 API | **Cookie session + CSRF** |
| `/media/**` | 图片资源（Nginx 反代到 MinIO，见 `01` §4.3） | 无 |
| `/actuator/**` | 健康检查与指标 | 仅本机 / 内网 |
| `/admin/**` | 后台前端静态文件 | 页面本身公开；数据只走受保护的 `/admin/api/**` |

**版本策略**：路径版本 `/v1`。**只有破坏性变更才升版本**；加字段不是破坏性变更。

**命名**：路径用复数名词（`/posts`），动作用子资源或动词后缀（`/posts/{id}/publish`）。查询参数用小驼峰。

---

## 2. 统一响应 envelope

**所有接口统一，没有例外。**

成功：

```json
{ "code": 0, "message": "ok", "data": { "items": [], "page": 1, "size": 10, "total": 0 } }
```

失败：

```json
{
  "code": 10001,
  "message": "参数校验失败",
  "data": null,
  "errors": [
    { "field": "title", "code": "NotBlank", "message": "标题不能为空" }
  ]
}
```

**硬规则**：

| 规则                     | 说明                                                     |
| ---------------------- | ------------------------------------------------------ |
| `code = 0` 才算成功        | 非 0 一律失败，前端只看 `code`                                   |
| `message` 可直接展示给用户     | 中文、面向用户；**绝不暴露异常堆栈或 SQL**                              |
| `errors` 仅字段级校验失败时出现   | 用于前端表单标红                                               |
| 每个响应带 `X-Trace-Id` 响应头 | 日志同字段可搜，排查靠它                                           |

---

## 3. 错误码表

| 段 | 领域 |
|---|---|
| `0` | 成功 |
| `10000–19999` | 通用 / 参数 |
| `20000–29999` | 认证与权限 |
| `30000–39999` | 内容（文章 / 动态 / 标签） |
| `40000–49999` | 媒体资源 |
| `50000–59999` | 互动（留言 / 阅读量） |
| `60000–69999` | 检索 |
| `70000–79999` | AI |
| `90000–99999` | 系统 |

| Code | HTTP | 含义 |
|---|---|---|
| `0` | 200 | 成功 |
| `10001` | 400 | 参数校验失败（带 `errors`） |
| `10002` | 400 | 请求体格式错误 |
| `10003` | 404 | 资源不存在 |
| `10004` | 409 | 并发冲突（乐观锁版本不匹配） |
| `10005` | 429 | 请求过于频繁 |
| `10006` | 405 | 请求方法不被支持 |
| `20001` | 401 | 未登录或会话已过期 |
| `20002` | 403 | CSRF 校验失败 |
| `20003` | 429 | 登录失败次数过多，已临时锁定 |
| `20004` | 401 | 用户名或密码错误（**不区分是哪个错**） |
| `30001` | 404 | 文章不存在 |
| `30002` | 409 | slug 已被占用 |
| `30003` | 400 | 排期时间必须是未来时间 |
| `30004` | 400 | 标签数量超过上限（5 个） |
| `30005` | 400 | 标签名长度不合法（1–20 字） |
| `30006` | 409 | 文章有未发布的修改，请先发布或放弃修改 |
| `30007` | 400 | 公开文章必须有摘要 |
| `30008` | 404 | 短动态不存在 |
| `30009` | 400 | 短动态内容超过 500 字 |
| `30010` | 409 | 标签已存在 |
| `30011` | 409 | 当前状态下不允许该操作 |
| `30012` | 400 | 短动态配图超过上限（4 张） |
| `40001` | 400 | 不支持的文件类型 |
| `40002` | 400 | 文件超过大小上限（5MB） |
| `40003` | 400 | 文件内容不是有效图片 |
| `40004` | 404 | 资源不存在 |
| `40005` | 409 | 资源正在被引用，无法删除 |
| `50001` | 400 | 留言内容超过 1000 字 |
| `50002` | 429 | 留言提交过于频繁 |
| `50003` | 400 | 留言被判定为垃圾内容 |
| `60001` | 200 | ES 不可用，已降级到 PG 检索（**不是错误**，`data.degraded = true`） |
| `70001` | 429 | AI 月预算已超限 |
| `70002` | 503 | AI 上游服务不可用 |
| `70003` | 400 | AI 输入过长 |
| `90001` | 500 | 服务器内部错误 |
| `90002` | 503 | 服务暂时不可用（启动中 / 维护） |

---

## 4. 分页

请求：`?page=1&size=10`（`page` 从 **1** 开始）

```json
{
  "code": 0, "message": "ok",
  "data": {
    "items": [ ... ],
    "page": 1, "size": 10, "total": 42, "totalPages": 5
  }
}
```

| 规则 | 值 |
|------|-----|
| `size` 上限 | 公开接口 50；后台接口 100 |
| 默认 `size` | 10 |
| 排序 | 公开列表固定 `published_at DESC` |
| 越界 page | 返回空 `items`，**不报错**（爬虫友好） |
| 分页方式 | **offset 分页足够**，不引入 cursor。博客内容量小，且 RAG 走 ES |

---

## 5. 认证与会话

```
POST /admin/api/auth/login   { username, password }
  → 200 + Set-Cookie: SESSION=<opaque, 32字节随机>
      HttpOnly; Secure; SameSite=Strict; Path=/
```

| 项 | 规则 |
|---|---|
| 会话存储 | Redis `session:{id}` → `{ userId, csrfToken, createdAt }`，TTL **7 天**，每次访问续期 |
| CSRF | **所有非 GET 的 `/admin/api/**` 必须带 `X-CSRF-Token`**，与服务端会话中的值比对（常量时间比较） |
| 登出 | `POST /admin/api/auth/logout` → 删 Redis key + 清 Cookie |
| 防爆破 | 同 IP 连续失败 5 次 → 锁定 15 分钟（Redis 计数，key 带 IP 哈希） |
| 密码 | **BCrypt(cost=12)**。不用 Argon2id 是因为它要额外引 BouncyCastle，为单个管理员账号不值得；bcrypt cost=12 在 OWASP 可接受范围内，且哈希自带算法前缀，将来换算法可平滑迁移（论证见 `08-deployment-and-ops.md` 的安全清单） |
| 不做 | JWT、RBAC、API Token |

> **关于 API Token**：你选了只做 Cookie session，所以脚本/CLI 发文这条路是关闭的。将来要开，只是多发一种凭证类型，**不影响现有会话结构**。

---

## 6. 导出接口（CI 用）

```
GET /api/v1/export
Header: X-Export-Token: <token>
```

| 项 | 规则 |
|---|---|
| Token 存放 | GitHub Secrets + 服务器环境变量，**绝不进 Git、绝不进配置文件** |
| 返回内容 | 全量发布快照：`posts` + `notes` + `tags` + `siteConfig`（站名 / 简介 / 渲染好的关于页 HTML / 封面图与头像地址） |
| 排序 | 稳定排序（`published_at DESC, id DESC`），保证内容不变时响应字节一致 |
| **ETag** | 响应带 `ETag`（全部内容 hash）。CI 带 `If-None-Match` 请求，**内容没变直接 304** —— 省掉每次全量传输 |
| 限流 | 每分钟 ≤ 10 次（CI 正常远低于此） |
| 只含公开内容 | **`PRIVATE` 文章和动态永不出现在这里** |

> ETag 这一条很实在：CI 每 30 分钟可以无脑调一次导出检查，内容没变就是 304，几乎零成本。这样即使漏了一次 webhook 触发，最坏 30 分钟也会自动上线。

---

## 7. 端点清单

> **这一节是「目标契约」，不是「已实现清单」。**
>
> 契约先定、实现按阶段门推进，所以两者会有一段时间的差距 —— 但**差距必须看得见**。
> 状态标记：`✅` 已实现 ｜ `🚧` 未实现（在计划内）｜ `❌` 刻意不做。
> 实现进度按 `03-roadmap.md` 的阶段门推进。
>
> **截至 G4 通过时，认证、文章、排期、媒体上传、站点配置、构建记录与站内搜索已实现。**

### 7.1 公开 API（`/api/v1`）

| 方法 | 路径 | 状态 | 说明 |
|------|------|:--:|------|
| GET | `/posts` | ✅ | 文章列表（分页，可按 `tag` / `year` / `month` 过滤） |
| GET | `/posts/{slug}` | ✅ | 文章详情（含上下篇）。相关文章属于 G5 的 AI 那批 |
| GET | `/notes` | 🚧 | 短动态流（分页） |
| GET | `/notes/{id}` | 🚧 | 单条动态 |
| GET | `/tags` | ❌ | **刻意不做**：静态站构建时用 `/export` 拿标签，多一个公开入口只会多一处要维护、要限流、要保持一致性的地方 |
| GET | `/archive` | 🚧 | 独立归档统计接口，当前公开站直接基于 `/export` 在构建期生成归档页 |
| GET | `/search?q=` | ✅ | 搜索（ES 主，PG 降级；降级返回 HTTP 200 + code 60001） |
| POST | `/views` | 🚧 | 阅读量打点（**幂等、永不报错、返回 204**） |
| GET | `/comments?postId=` | 🚧 | 已审核留言 |
| POST | `/comments` | 🚧 | 提交留言（默认 `PENDING`） |
| GET | `/export` | ✅ | 全量导出（Token 鉴权；带 ETag，内容没变回 304） |

> **RSS / sitemap 不在后端** —— 由 Next.js 在构建时生成，零运行时开销。

### 7.2 管理 API（`/admin/api`）

| 分组 | 端点 | 状态 |
|------|------|:--:|
| 认证 | `POST /auth/login`、`POST /auth/logout`、`GET /auth/me` | ✅ |
| 文章 | `GET/POST /posts`、`GET/PATCH/DELETE /posts/{id}`、`POST /posts/{id}/publish`、`/archive`、`/restore`、`/preview`、`POST /posts/slug-suggest` | ✅ |
| 文章·排期 | `POST /posts/{id}/schedule`、`/cancel-schedule` | ✅ 每分钟扫描，到点自动发布 |
| 动态 | `GET/POST /notes`、`GET/PATCH/DELETE /notes/{id}`、`POST /notes/{id}/archive`、`/restore` | 🚧 |
| 媒体 | `POST /assets`（multipart 上传） | ✅ 只做了上传：内容嗅探 + 内容去重 + 落 MinIO，暂无缩略图 |
| 媒体·其余 | `GET /assets`、`DELETE /assets/{id}` | 🚧 |
| 标签 | `GET /tags`、`DELETE /tags/{id}`（新建走"保存文章时按名称自动创建"，不单独开接口） | 🚧 |
| 留言 | `GET /comments?status=`、`GET /comments/stats`、`POST /comments/{id}/approve`、`/reject`、`/spam`、`/pending`、`DELETE /comments/{id}` | 🚧 |
| 站点配置 | `GET/PUT /site-config`、`POST /site-config/preview` | ✅ 站名 / 简介 / 关于页正文（Markdown）/ 封面图 / 头像；保存即记一条构建请求 |
| 构建 | `GET /builds`、`POST /builds/trigger`（手动触发） | ✅ 10s 扫描 + 30s 防抖合并成一次 `repository_dispatch`；需 `BLOG_SITE_BUILD_ENABLED=true` + token 才真的发出去 |
| 搜索 | `GET /search/status`、`POST /search/reindex` | ✅ ES 状态、积压数、全量重建；重建期间公开搜索走 PG |
| 统计 | `GET /stats`（阅读量 / AI 成本 / 内存快照） | 🚧 待做 |
| AI | `POST /ai/summary`、`/ai/tags`、`/ai/related` | 🚧 G5 |

### 7.3 实时预览端点（`POST /admin/api/posts/{id}/preview`）

```
请求  { "contentMd": "..." }
响应  { "html": "...", "wordCount": 1234, "readingMinutes": 4 }
```

| 规则 | 说明 |
|---|---|
| 渲染器 | **与发布时同一个** `MarkdownRenderer` —— 预览与线上必须像素级一致，否则预览就是骗人的 |
| 副作用 | **没有**。不写库、不碰发布快照、不触发构建、不推 ES |
| 为什么是 POST | 编辑器里有未保存的内容，必须把正文一起传上来 |

> 它补偿的是静态方案的发布延迟（`01` §7.2）：改一个错别字不用等 2 分钟构建就能看到效果。
> **这是静态架构能成立的前提之一，不是可选功能。**

站点配置的关于页正文另有 `POST /admin/api/site-config/preview`，规则完全一样：同一个渲染器、零副作用，
区别只是它不挂在某篇文章上。

---

## 8. 包结构

```
com.abyssvstar.blog
├── BlogApplication.kt
├── shared/                     跨模块共用的技术设施
│   ├── web/                    统一 envelope、全局异常处理、分页封装、TraceId 过滤器
│   ├── security/               会话、CSRF、登录拦截器
│   ├── persistence/            基础实体、审计字段
│   └── util/                   拼音、Markdown 渲染、哈希
├── post/                       文章模块
│   ├── web/                    AdminPostController、PublicPostController、dto/
│   ├── service/                PostService（含 slug 与自动保存）、PublishService、
│   │                           ScheduledPublisher、PostSourceHash
│   ├── repository/             PostRepository、PostPublicationRepository、PublishedContentSpec
│   └── domain/                 Post、PostPublication、PostStatus
├── note/                       短动态模块
├── taxonomy/                   标签模块
├── media/                      图片模块（上传、缩略图、孤儿清理）
├── comment/                    留言模块（含反垃圾四道）
├── search/                     检索模块
│   ├── SearchPort.kt           接口：index / delete / search
│   ├── es/                     ElasticsearchSearchAdapter
│   ├── pg/                     PostgresFallbackAdapter（pg_trgm）
│   └── sync/                   EsSyncService、EsSyncCompensator（补偿任务）
├── ai/                         AI 模块（摘要、标签、相关文章、RAG）
├── metrics/                    阅读量聚合、AI 成本统计
├── sitebuild/                  静态站构建触发（防抖、状态跟踪）
├── export/                     CI 全量导出（Token 鉴权、ETag）
└── admin/                      后台 UI 资源与页面入口
```

**四条铁律**：

1. 模块之间**只通过 service 层接口调用**，不允许跨模块直接访问对方的 `repository`
2. `shared` **不允许依赖任何业务模块**（单向依赖）
3. 每个模块的 `domain` 只放领域对象，**不依赖 Spring**
4. **业务侧不引入自造接口**（现有的 interface 全是 MyBatis 的 Mapper，框架要求）。将来唯一该有的是 `SearchPort`，因为它真的有两个实现（ES 主 + PG 降级）

> 第 4 条是刻意的：**只有一个实现的时候，抽象就是负债。** 这条规则能长期防止"为了解耦而解耦"。

---

## 9. 校验与异常

| 场景 | 处理 |
|------|------|
| 请求参数 | Bean Validation（`@Valid` + `@NotBlank` / `@Size` / `@Pattern`），DTO 上声明 |
| 业务规则 | 抛 `BusinessException(code, message)` |
| 统一转换 | `@RestControllerAdvice` 全局处理，转成 envelope |
| 字段校验失败 | `10001` + `errors` 数组（字段名 / 约束名 / 消息） |
| 未登录 | `20001` + HTTP 401 |
| 未捕获异常 | `90001` + HTTP 500；**日志记完整堆栈，响应只给"服务器内部错误" + traceId** |
| 限流 | 拦截器 + Redis 计数，超限 `10005` / `50002` + HTTP 429 |

---

## 10. 待定项（后续批次）

- ES 索引 mapping、IK 词典、`dense_vector` 维度、索引同步与补偿细节（第 4 批）
- 前端页面清单、路由、设计规范、SEO（第 5 批）
- 服务器初始化、Nginx、CI/CD、备份、监控告警、安全细节（第 6 批）
