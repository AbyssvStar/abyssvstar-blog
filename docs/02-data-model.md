# 02 数据模型（施工图）

单库 `blog`，单 schema `public`，所有时间列 `timestamptz`。

---

## 1. 表清单（13 张）

| # | 表 | 用途 |
|---|---|---|
| 1 | `admin_user` | 唯一的管理员账号 |
| 2 | `posts` | 文章**工作副本**（编辑中的内容） |
| 3 | `post_publications` | 文章**发布快照**（线上内容，静态站 + ES 的唯一数据源） |
| 4 | `notes` | 短动态 |
| 5 | `note_assets` | 短动态配图（有序） |
| 6 | `tags` | 标签 |
| 7 | `post_tags` | 文章-标签关联（关联工作副本） |
| 8 | `assets` | 图片资源 |
| 9 | `comments` | 留言板 |
| 10 | `daily_views` | 阅读量按天聚合 |
| 11 | `ai_usage` | AI 调用成本账本 |
| 12 | `site_builds` | 静态站构建触发记录 |
| 13 | `site_config` | 站点配置（单行：站名 / 简介 / 关于页正文） |

> **ES 路线下没有 `content_embeddings` 表**：向量存 ES 的 `dense_vector` 字段，不需要 pgvector

---

## 2. posts —— 文章工作副本

| 列                           | 类型          | 约束                           | 说明                                               |
| --------------------------- | ----------- | ---------------------------- | ------------------------------------------------ |
| `id`                        | bigserial   | PK                           |                                                  |
| `slug`                      | text        | NOT NULL                     | 中文标题自动转拼音，可手动覆盖                                  |
| `title`                     | text        | NOT NULL                     |                                                  |
| `summary`                   | text        |                              | 摘要，AI 可生成                                        |
| `content_md`                | text        | NOT NULL                     | **编辑中的 Markdown，不直接上线**                          |
| `cover_asset_id`            | bigint      | → assets(id)                 | 封面                                               |
| `status`                    | text        | NOT NULL DEFAULT `'DRAFT'`   | `DRAFT` / `SCHEDULED` / `PUBLISHED` / `ARCHIVED` |
| `visibility`                | text        | NOT NULL DEFAULT `'PUBLIC'`  | `PUBLIC` / `PRIVATE`                             |
| `publish_at`                | timestamptz |                              | `SCHEDULED` 时的排期时间                               |
| `published_at`              | timestamptz |                              | 对外生效时间（用于排序与 RSS）                                |
| `last_published_at`         | timestamptz |                              | 最近一次点「发布」的时间                                     |
| `view_count`                | bigint      | NOT NULL DEFAULT 0           | 聚合阅读量                                            |
| `es_sync_status`            | text        | NOT NULL DEFAULT `'PENDING'` | `PENDING` / `SYNCED` / `FAILED` / `SKIPPED`      |
| `es_synced_at`              | timestamptz |                              |                                                  |
| `version`                   | bigint      | NOT NULL DEFAULT 0           | **乐观锁版本号**，自动保存冲突检测用（见 `04-domain-rules.md` §5）  |
| `deleted_at`                | timestamptz |                              | 软删除                                              |
| `created_at` / `updated_at` | timestamptz | NOT NULL DEFAULT now()       | 自动保存会频繁改 `updated_at`                            |

```sql
ALTER TABLE posts ADD CONSTRAINT posts_status_ck
  CHECK (status IN ('DRAFT','SCHEDULED','PUBLISHED','ARCHIVED'));
ALTER TABLE posts ADD CONSTRAINT posts_visibility_ck
  CHECK (visibility IN ('PUBLIC','PRIVATE'));
ALTER TABLE posts ADD CONSTRAINT posts_scheduled_ck
  CHECK (status <> 'SCHEDULED' OR publish_at IS NOT NULL);
```

索引：

| 索引 | 服务谁 |
|---|---|
| `UNIQUE (slug) WHERE deleted_at IS NULL` | 公开 URL 唯一性 |
| `(status, published_at DESC) WHERE deleted_at IS NULL` | 后台列表、归档页 |
| `(status, publish_at) WHERE status = 'SCHEDULED'` | 定时发布扫描（每分钟） |
| `(es_sync_status) WHERE es_sync_status <> 'SYNCED'` | ES 补偿任务 |
| `GIN (title gin_trgm_ops)` + `GIN (summary gin_trgm_ops)` | ES 挂掉时的降级搜索 |

---

## 3. post_publications —— 发布快照

**与 `posts` 是 1:1，只保留最新一次发布。**

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `post_id` | bigint | PK → posts(id) ON DELETE CASCADE | |
| `slug` | text | NOT NULL | 发布时的 slug（改了 slug 要触发构建） |
| `title` | text | NOT NULL | |
| `summary` | text | NOT NULL | |
| `html` | text | NOT NULL | 发布时渲染好的 HTML |
| `content_md` | text | | **发布时的 Markdown 原文**（V11 起）；G4 切 chunk 用，老快照为空 |
| `cover_url` | text | | 发布时的封面 URL 快照 |
| `tags` | jsonb | NOT NULL DEFAULT `'[]'` | 标签名快照 |
| `word_count` | int | NOT NULL | |
| `reading_minutes` | int | NOT NULL | |
| `source_hash` | text | NOT NULL | 发布时工作副本的 sha256，用于判定"有未发布修改" |
| `published_at` | timestamptz | NOT NULL | "更新线上"会刷新它 |
| `created_at` / `updated_at` | timestamptz | | |

```sql
CREATE UNIQUE INDEX post_publications_slug_uq ON post_publications (slug);
CREATE INDEX post_publications_pub_idx ON post_publications (published_at DESC);
CREATE INDEX post_publications_tags_idx ON post_publications USING GIN (tags);
```

> **这张表是静态导出接口 `/api/v1/export` 和 ES 索引的唯一数据源。** 两者读同一张表 → 天然一致。

**为什么标签存 jsonb 而不是关联到 `post_tags`**：`post_tags` 关联的是**工作副本**。如果把已发布标签也放那儿，那么"我改标签"就会立刻改变线上展示，违背发布语义。所以标签在发布时快照成 jsonb。这也让"删标签不删文章"自动成立。

---

## 4. notes —— 短动态

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | bigserial | PK | URL 用 `/notes/{id}`，不用 slug |
| `content` | text | NOT NULL, ≤ 500 字 | **纯文本，不支持 Markdown** |
| `status` | text | NOT NULL DEFAULT `'PUBLISHED'` | `PUBLISHED` / `ARCHIVED`（无 `SCHEDULED`） |
| `visibility` | text | NOT NULL DEFAULT `'PUBLIC'` | `PUBLIC` / `PRIVATE` |
| `published_at` | timestamptz | NOT NULL | |
| `view_count` | bigint | NOT NULL DEFAULT 0 | |
| `es_sync_status` / `es_synced_at` | | | 同 posts |
| `deleted_at` / `created_at` / `updated_at` | timestamptz | | |

**动态不做工作副本/发布快照的分离**：它是即时媒介，没有长草稿过程。编辑后直接改内容并触发构建。

### note_assets

| 列 | 类型 | 说明 |
|---|---|---|
| `note_id` | bigint → notes(id) ON DELETE CASCADE | |
| `asset_id` | bigint → assets(id) | |
| `sort_order` | int NOT NULL DEFAULT 0 | 图片顺序 |

主键 `(note_id, asset_id)`；每篇 ≤ 4 张由应用层校验。

---

## 5. 分类与资源

### tags

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | bigserial PK | |
| `name` | text UNIQUE NOT NULL | 1–20 字 |
| `slug` | text UNIQUE NOT NULL | 拼音 |
| `created_at` | timestamptz | |

### post_tags

`(post_id bigint → posts, tag_id bigint → tags)`，主键 `(post_id, tag_id)`。
每篇 ≤ 5 个由应用层校验（前后端双重）。**删标签只删关联行，`posts` 一行不动。**

### assets

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | bigserial PK | |
| `path` | text NOT NULL | **对象名**，如 `2026/09/{uuid}.png`。完整 URL = `{blog.storage.public-base-url}/{path}`（见 `01` §4.3） |
| `original_name` | text | |
| `mime` | text NOT NULL | 白名单：jpeg / png / webp / gif |
| `size_bytes` | bigint NOT NULL | ≤ 5MB |
| `width` / `height` | int | |
| `sha256` | text NOT NULL | 内容去重 |
| `variants` | jsonb | `{"w400": "...", "w800": "..."}` |
| `deleted_at` / `created_at` | timestamptz | 软删除；7 天无引用才物理删文件 |

```sql
CREATE UNIQUE INDEX assets_sha_uq ON assets (sha256) WHERE deleted_at IS NULL;
```

---

## 6. comments —— 最简留言板（不做嵌套）

| 列                            | 类型                                | 说明                                           |
| ---------------------------- | --------------------------------- | -------------------------------------------- |
| `id`                         | bigserial PK                      |                                              |
| `post_id`                    | bigint NULL → posts               | **NULL = 站内留言板**                             |
| `author_name`                | text NOT NULL                     | ≤ 30 字                                       |
| `author_email`               | text NULL                         | 可选，**永不公开**，仅用于回复通知（第二阶段）                    |
| `content`                    | text NOT NULL                     | ≤ 1000 字                                     |
| `status`                     | text NOT NULL DEFAULT `'PENDING'` | `PENDING` / `APPROVED` / `REJECTED` / `SPAM` |
| `ip_hash`                    | text NOT NULL                     | **只存哈希，绝不存原始 IP**                            |
| `user_agent_hash`            | text                              | 辅助反垃圾                                        |
| `created_at` / `reviewed_at` | timestamptz                       |                                              |

索引：`(status, created_at DESC)`、`(post_id, status, created_at DESC)`、`(ip_hash, created_at DESC)`

**防垃圾四道（顺序执行，命中即短路）**：

1. **蜜罐字段** —— 表单里藏不可见 input，有值 → `SPAM`
2. **提交耗时** —— 从加载表单到提交 < 3 秒 → `SPAM`
3. **限流** —— 同 `ip_hash` 每小时 ≤ 5 条，超出 → 返回 429
4. **默认 `PENDING`，审核后才展示** —— 最有效的一道

---

## 7. 度量

### daily_views

| 列 | 类型 | 说明 |
|---|---|---|
| `date` | date | |
| `content_type` | text | `POST` / `NOTE` |
| `content_id` | bigint | |
| `count` | int NOT NULL DEFAULT 0 | |

主键 `(date, content_type, content_id)`。5 分钟一次从 Redis 增量落库。

### ai_usage

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | bigserial PK | |
| `feature` | text | `SUMMARY` / `TAGS` / `RELATED` / `RAG_QA` / `EMBEDDING` |
| `model` | text | |
| `prompt_tokens` / `completion_tokens` | int | |
| `cost_estimate` | numeric(10,6) | 按单价估算 |
| `cached` | boolean | 是否命中缓存 |
| `ref` | text | 关联内容，如 `post:123` |
| `created_at` | timestamptz | |

必须随时看得见花了多少。后台首页直接显示「本月已花费 ¥X.XX」，缓存命中率也在这里算。

### site_builds

| 列                           | 类型                                | 说明                                           |
| --------------------------- | --------------------------------- | -------------------------------------------- |
| `id`                        | bigserial PK                      |                                              |
| `reason`                    | text                              | 如 `post.published:123`、`comment.approved:45` |
| `status`                    | text NOT NULL DEFAULT `'PENDING'` | `PENDING` / `FIRED` / `FAILED` / `CANCELLED` |
| `requested_at` / `fired_at` | timestamptz                       |                                              |
| `run_url`                   | text                              | GitHub Actions 运行链接，后台可点进去                   |
| `error`                     | text                              | 失败原因                                         |

索引：`(status, requested_at)`

---

## 8. site_config —— 站点配置

单行表（`id smallint` 主键 + `CHECK (id = 1)`）。全站只有一份配置，多出一行是没有语义的状态，
用约束从库这一层挡住，而不是靠代码自觉。

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | smallint PK | 恒为 1 |
| `title` | text NOT NULL | 站名。页头、页脚、浏览器标签栏都用它 |
| `description` | text NOT NULL | SEO 与社交卡片的一句话 |
| `about_md` | text NOT NULL DEFAULT `''` | 关于页正文的 **Markdown 原文** |
| `about_cover_url` | text | 关于页封面图（media 地址，可空） |
| `about_avatar_url` | text | 关于页头像（media 地址，可空） |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

**只装「作者手写的站点级文字」。** 导航、许可、背景图那些改了要连着改模板的常量，仍然留在公开站代码里 ——
搬进数据库只会多出「改了没效果」的困惑。搬进来的判断标准是：改它的人不需要改代码。

**关于页正文在导出时渲染成 HTML**（`/api/v1/export` 的 `siteConfig.aboutHtml`），用的就是文章那套渲染器。
好处是公开站不需要带 Markdown 解析器，标题锚点、代码配色也走和文章正文完全相同的那段构建期处理。

保存即上线：内容真的变了才记一条 `PENDING`，由防抖任务合并成一次构建（见 `04-domain-rules.md` 的构建触发一节）。
两列图片存的是 URL 快照而不是 `assets` 外键：换图就是换一个地址，不值得为「这张图属于站点配置」再加一张关联表。

**关于页的版式不在正文里**。作者写的是 Markdown，站点负责套上「大图 banner + 圆头像 + 一张大卡」这套骨架
（在 `frontend/site/app/about/page.tsx`）。理由：正文里手写 `<style>` 会把颜色写死、在亮暗两个主题下都错，
而且站点的 class 名一旦被作者的 HTML 撞上就互相破坏。正文里写 HTML 是允许的，但站点自己的类名统一带
`about-` / `term-` 前缀，撞车时能一眼看出是谁的。

---

## 9. 迁移列表（Flyway）

| 版本 | 内容 |
|---|---|
| `V1__baseline.sql` | `admin_user`、`posts`、`assets` |
| `V2__publications.sql` | `post_publications` |
| `V3__taxonomy.sql` | `tags`、`post_tags` |
| `V4__notes.sql` | `notes`、`note_assets` |
| `V5__comments.sql` | `comments` |
| `V6__metrics.sql` | `daily_views`、`ai_usage`、`site_builds` |
| `V7__trgm_fallback.sql` | `CREATE EXTENSION pg_trgm` + 降级搜索索引 |
| `V8__job_indexes.sql` | 定时发布扫描索引、ES 补偿索引 |
| `V9__site_config.sql` | `site_config` 单行表 |
| `V10__site_config_about_images.sql` | 关于页封面图 / 头像两列 |
| `V11__publication_content_md.sql` | `post_publications.content_md`（发布时冻结 Markdown） |
| `V12__publication_trgm.sql` | 降级搜索 trigram 索引改到 `post_publications`，删掉 `posts` 上那两个 |
| `V9__site_config.sql` | `site_config`（单行，含首行种子配置） |
| `V10__site_config_about_images.sql` | `site_config` 加关于页的封面图 / 头像两列 |

> 后续迁移**只增不改**：已应用的迁移文件永不修改，结构变更一律新开 `V{n+1}`。

---

## 10. 待定项（后续批次）

- ES 索引 mapping、IK 词典配置、`dense_vector` 维度与相似度（第 4 批）
- 索引同步与补偿策略细节（第 4 批）
- API 契约与分页形态（第 3 批）
- 备份策略与保留周期（第 6 批）