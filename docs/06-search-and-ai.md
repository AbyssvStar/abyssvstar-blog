# 06 搜索与 AI（施工图）

---

## 1. ES 索引设计：三个索引

| 索引 | 粒度 | 服务谁 |
|------|------|--------|
| `blog_article` | **文章级**（一篇 = 一个文档，含短动态） | 站内搜索（BM25） |
| `blog_chunk` | **段落级**（一个标题段落 = 一个文档，带向量） | RAG 检索（混合检索） |
| `blog_qa_cache` | 问答对（带问题向量） | 语义缓存 |

> **为什么分两层粒度**：搜索要的是"整篇文章"（列表页要能展示标题和摘要）；RAG 要的是"精确到段落"（能引用、能跳转、不被无关段落稀释）。两者需求不同，硬塞进一个索引会让两边都变差。

> **`posts` 和 `notes` 放同一个 `blog_article` 索引**，用 `docType` 字段区分（`POST` / `NOTE`）。ES 7+ 取消了 type，用字段过滤是标准做法——这样搜索一次只查一个索引。

---

## 2. `blog_article` mapping

```json
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "refresh_interval": "5s",
    "analysis": {
      "analyzer": {
        "cn_index": { "type": "custom", "tokenizer": "ik_max_word" },
        "cn_search": { "type": "custom", "tokenizer": "ik_smart" }
      }
    }
  },
  "mappings": {
    "properties": {
      "docType":     { "type": "keyword" },
      "contentId":   { "type": "long" },
      "slug":        { "type": "keyword" },
      "title":       { "type": "text", "analyzer": "cn_index", "search_analyzer": "cn_search" },
      "summary":     { "type": "text", "analyzer": "cn_index", "search_analyzer": "cn_search" },
      "body":        { "type": "text", "analyzer": "cn_index", "search_analyzer": "cn_search" },
      "tags":        { "type": "keyword" },
      "publishedAt": { "type": "date" },
      "viewCount":   { "type": "long" },
      "contentHash": { "type": "keyword" }
    }
  }
}
```

**IK 分词器的标准用法（重要细节）**：

| 位置 | 分词器 | 原因 |
|------|--------|------|
| **索引时** | `ik_max_word`（细粒度，穷尽切分） | 让尽可能多的词进入倒排索引 → **召回率高** |
| **查询时** | `ik_smart`（粗粒度，最粗切分） | 避免把查询词切得太碎导致噪声 → **精度高** |

> 这是 IK 的官方推荐组合。反过来的话召回和精度都会掉。

**标题权重**靠查询时的 `multi_match` 的 `^` 提权（`title^3 summary^1.5 body`），不靠 mapping 的 `boost`（mapping boost 已废弃）。

---

## 3. `blog_chunk` mapping

```json
{
  "settings": { "number_of_shards": 1, "number_of_replicas": 0, "refresh_interval": "5s" },
  "mappings": {
    "properties": {
      "postId":      { "type": "long" },
      "slug":        { "type": "keyword" },
      "chunkIndex":  { "type": "integer" },
      "headingPath": { "type": "text", "analyzer": "cn_index", "search_analyzer": "cn_search" },
      "text":        { "type": "text", "analyzer": "cn_index", "search_analyzer": "cn_search" },
      "anchor":      { "type": "keyword" },
      "contentHash": { "type": "keyword" },
      "vector": {
        "type": "dense_vector",
        "dims": 1024,
        "index": true,
        "similarity": "cosine"
      }
    }
  }
}
```

**维度 1024 来自 bge-m3**（本项目的 embedding 模型）。`similarity: cosine` 对应归一化向量的余弦距离。

> **dim 一旦定下就不能改**——换模型必须重建整个索引。所以 `dims` 与模型名一起写在配置里，代码启动时校验配置中的模型与索引 dim 是否匹配，不匹配就**启动失败并明确报错**，而不是静默产生错结果。

---

## 4. chunk 切分规则

输入是发布快照的 Markdown，输出是一组 chunk。

```
用 CommonMark AST 遍历，维护一个「标题栈」：

  遇到 H1/H2/H3/H4 → 压栈/出栈，更新当前 headingPath
  遇到正文段落    → 累积到当前 chunk
  遇到代码块      → 累积到当前 chunk，且标记「不可切分」

每遇到新的标题（或遍历结束）→ 输出当前 chunk
```

| 规则 | 值 |
|------|-----|
| `headingPath` | `"文章标题 > 二级标题 > 三级标题"`，**同时写进 `headingPath` 字段并作为 `text` 的前缀** |
| `anchor` | 标题的 GitHub 风格锚点（如 `为什么用-rrf`），**用于引用跳转** `/posts/{slug}#{anchor}` |
| 单 chunk 上限 | 800 tokens；超出则按段落边界再切，**子 chunk 保留相同 headingPath 与 anchor** |
| 代码块 | **绝不从中间切开**；整块作为一个不可切分单元 |
| 最小长度 | < 50 字则并入前一个 chunk（避免碎片污染召回） |
| 无标题的起始段 | headingPath 只有文章标题 |

**为什么要保留标题路径**：一个 chunk 里写着"这样能避免重复计算"，单独看毫无意义。加上 `"Redis 缓存 > 缓存穿透 > 解决方案"` 前缀后，BM25 能命中、向量也有正确语境、引用时读者也知道在讲什么。**这一个设计对 RAG 质量的影响比换模型更大。**

---

## 5. 索引同步

### 5.1 主路径

```
发布事务提交后（异步，失败不影响发布）：
  1. 按 post_publications 的内容切 chunk
  2. Bulk 写入：
       - blog_article：UPSERT 文章级文档
       - blog_chunk：先 DELETE 该 postId 的所有旧 chunk，再 Bulk 插入新 chunk
  3. 成功 → posts.es_sync_status = 'SYNCED', es_synced_at = now()
     失败 → posts.es_sync_status = 'FAILED'
```

**为什么 chunk 要先删后插**：文章改短了以后，旧的多余 chunk 会残留在索引里，搜到就是幽灵内容。**先按 `postId` 删干净再插**，简单且不会错。用 `delete_by_query` + `bulk`，不要逐条删。

**`contentHash` 的作用**：索引前比对 `blog_article` 里已有的 `contentHash`，**相同就直接跳过**（自动保存可能触发多次同步请求，这是省钱省 IO 的第一道闸）。

### 5.2 补偿任务

```
@Scheduled(fixedDelay = 60s)
  SELECT * FROM posts
   WHERE es_sync_status = 'FAILED' AND deleted_at IS NULL
   ORDER BY updated_at DESC LIMIT 20
  → 重新走同步流程；连续失败 5 次 → 记 ERROR 日志并告警
```

| 边界场景 | 处理 |
|---------|------|
| ES 长时间不可用 | 补偿任务持续重试；搜索结果自动降级到 PG，**站不会挂** |
| 文章被删除 / 转私密 | `es_sync_status = 'SKIPPED'`，并从两个索引中删除文档 |
| 需要全量重建 | 后台「重建索引」按钮 → 清空索引 → 遍历所有发布快照重新写入（分批 + 限速，别打满内存） |
| 补偿任务与发布同时发生 | 以 `contentHash` 为幂等键，重复写入结果一致 |

> **绝不把 ES 写入放进发布事务。** 发布是作者的动作，索引是衍生物。ES 挂了必须仍然能发文——这是定下的降级原则。

---

## 6. 搜索接口

```
GET /api/v1/search?q=xxx&page=1&size=10
```

```
1. 查询 blog_article：
     multi_match { query: q, fields: ["title^3", "summary^1.5", "body"] }
     + docType 过滤 + publishedAt 排序权重
2. 高亮：title / summary / body 片段，用 <mark> 包裹
3. ES 异常 → 降级 PostgresFallbackAdapter：
     SELECT ... WHERE title ILIKE '%q%' OR summary ILIKE '%q%'
     ORDER BY similarity(title, q) DESC     -- pg_trgm
     结果标注 degraded: true，code 60001，HTTP 200
```

**降级不是错误**：`code = 60001` + HTTP 200，前端只在结果上方显示一行小字"搜索服务降级中"。

---

## 7. Embedding

| 项 | 值 |
|---|---|
| 模型 | `BAAI/bge-m3`，1024 维，cosine |
| 调用方式 | HTTP API（硅基流动等），**不在服务器上跑推理**（2 核扛不住） |
| 缓存 | key = `sha256(model + text)` → Redis（TTL 30 天）。**内容没变就不重算** |
| 批量 | chunk 向量化走批量接口（一次 ≤ 32 条），减少请求数 |
| 失败 | 重试 3 次（指数退避）→ 仍失败则 `es_sync_status = FAILED`，等补偿 |
| 降级 | Embedding 不可用时，**只写 BM25 部分**（`vector` 字段留空），RAG 退化为纯 BM25 检索，站仍可用 |

> 最后一条很关键：**没有向量也要能用。** 纯 BM25 的 RAG 质量差一些，但比整个问答功能 500 好得多。

---

## 8. RAG 流程

```
用户提问
  │
  ├─ 1. 语义缓存：kNN 查 blog_qa_cache
  │      相似度 ≥ 0.95 → 直接返回缓存答案（响应标注 cached: true）
  │
  ├─ 2. 混合检索（blog_chunk）：
  │      a. BM25：text + headingPath（title^2）          → top 20
  │      b. kNN：问题向量 → vector 字段                   → top 20
  │      c. RRF 融合（k = 60）                            → top 8
  │
  ├─ 3. 相关性判定：
  │      最高相似度 < 阈值 → 拒答：
  │        「我的文章里没有相关内容」 + 返回最相关的 3 篇
  │
  ├─ 4. 重排（第二阶段）：bge-reranker 对 top 8 重排 → top 4
  │
  ├─ 5. 组装 prompt（来源带编号，含标题路径与 URL）
  │
  ├─ 6. SSE 流式生成 → 答案里带 [1] [2] 引用
  │
  └─ 7. 记 ai_usage + 写入 blog_qa_cache
```

### 8.1 RRF：为什么不用手调权重

```kotlin
// Reciprocal Rank Fusion
score(d) = Σ_over_retrievers  1 / (k + rank_i(d))     // k = 60
```

| 对比 | 结论 |
|------|------|
| 加权求和（`0.7*bm25 + 0.3*vector`） | 需要归一化两路分数，而 BM25 分数和余弦相似度**量纲完全不同**，权重只能靠试 |
| **RRF** | 只用**排名**不用分数，天然免疫量纲问题，几乎不需要调参 |


### 8.2 Prompt 设计

```
系统提示（要点）：
  1. 只能依据下面提供的【资料】回答，不得使用资料以外的任何知识
  2. 资料不足以回答时，明确说"资料中没有提到"，绝不推测
  3. 每个事实性陈述后面标注来源编号，如 [1]
  4. 用中文回答，简洁，不要复述资料原文
  5. 涉及代码时保留代码块格式

温度：0.2      max_tokens：800
```

### 8.3 拒答与降级

| 情况            | 行为                                 |
| ------------- | ---------------------------------- |
| 检索最高分低于阈值     | 「我的文章里没有相关内容」+ 最相关 3 篇的链接          |
| Embedding 不可用 | 退化为纯 BM25 检索，**仍走完整 RAG 流程**       |
| ES 完全不可用      | 直接拒答并提示"搜索服务暂时不可用"（不做无检索生成——那必然会编） |
| LLM 上游不可用     | 返回「AI 服务暂时不可用」，并把检索到的来源列表给出来       |
| 月预算超限         | `70001` + 「本月 AI 预算已用完」            |

> **绝对不做"无检索生成"。** 没有资料就让模型自由发挥，等于给你的博客装了一个造谣机器。

### 8.4 阈值必须校准，不许拍脑袋

初始值给一个（比如余弦相似度 `0.45`），但**必须用评测集校准**：

| 项 | 做法 |
|---|---|
| 评测集 | 30–50 条，每条 = `问题 + 期望命中的文章` |
| 正例 | 你文章里确实有答案的问题 |
| 负例 | 你文章里**没有**答案的问题（如"怎么做红烧肉"）——**这类最关键** |
| 指标 | `recall@5`（正确文章是否在前 5）、**拒答准确率**（负例是否正确拒答） |
| 校准 | 扫一遍阈值，取"拒答准确率 ≥ 95% 时 recall@5 最高"的点 |

> 阈值调太松 → 编造；调太紧 → 天天说"不知道"。**没有评测集，你无法知道自己在哪一边。**

---

## 9. 语义缓存

```
索引 blog_qa_cache：
  { question, questionVector(dense_vector 1024), answer, sources[], hitCount, createdAt }
```

| 规则 | 值 |
|------|-----|
| 命中条件 | kNN 相似度 ≥ **0.95**（比检索阈值严格得多——缓存命中要求是"同一个问题"） |
| 命中后 | 直接流式回放缓存答案，`cached: true`，**不调 LLM** |
| 写入 | 每次成功生成后写入 |
| 清理 | `hitCount = 0` 且创建超过 90 天的条目定期清理 |
| 为什么不放 Redis | Redis 没有原生向量检索（除非上 RediSearch）；**ES 已经在手，复用零成本** |

---

## 10. 成本控制

| 措施 | 效果 |
|------|------|
| **语义缓存** | 重复问题零成本（个人博客的提问高度重复，这一项省最多） |
| **Embedding 缓存（content_hash）** | 内容没变不重算，批量接口 |
| **只取 top-4 chunk 进 prompt** | 直接决定 prompt 长度，是最有效的省钱手段 |
| **`blog_article` 的 contentHash 跳过** | 避免自动保存触发重复索引 |
| **月预算硬限** | `ai_usage` 当月汇总 > 阈值 → `70001`，AI 功能暂时关闭，站的其他部分正常 |
| 答案 `max_tokens = 800` | 防跑飞 |

**后台首页固定显示**：`本月已花费 ¥X.XX / 预算 ¥YY` + 缓存命中率 + 各 feature 的调用次数与平均成本。

---

## 11. 写作助手（第二阶段前）

| 功能 | 实现 | LLM 成本 |
|------|------|---------|
| 自动摘要 | LLM | 低 |
| 推荐标签 | 先用已有标签做 embedding 相似度匹配，**无匹配再调 LLM** | 极低 |
| **相关旧文** | **纯 embedding 相似度，零 LLM** | **零** |
| 起标题 | LLM | 低 |

> 「相关旧文」是性价比最高的一项：**零 LLM 成本、效果立刻可见、还是 RAG 检索层的复用**。

---

## 12. 待定项

- 前端页面清单、路由、设计规范、SEO（第 5 批）
- 服务器初始化、Nginx、CI/CD、备份、监控告警、安全细节（第 6 批）
