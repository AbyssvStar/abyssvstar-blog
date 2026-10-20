package com.abyssvstar.blog.search.es

import com.abyssvstar.blog.post.repository.PostPublicationRepository
import com.abyssvstar.blog.post.repository.PostRepository
import com.abyssvstar.blog.search.SearchHit
import com.abyssvstar.blog.search.SearchHitPage
import com.abyssvstar.blog.search.SearchItem
import com.abyssvstar.blog.search.SearchProperties
import com.abyssvstar.blog.search.SearchReader
import com.abyssvstar.blog.search.SearchReaderPage
import com.abyssvstar.blog.search.SearchSource
import com.abyssvstar.blog.search.SearchTextExtractor
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Component

@Component
class ElasticsearchSearchReader(
    private val props: SearchProperties,
    private val client: ElasticsearchHttpClient,
    private val posts: PostRepository,
    private val publications: PostPublicationRepository,
    private val text: SearchTextExtractor,
    private val objectMapper: ObjectMapper,
) : SearchReader {

    override val source: SearchSource = SearchSource.ELASTICSEARCH

    override fun search(query: String, page: Int, size: Int): SearchReaderPage {
        val hits = rawSearch(query, page, size)
        val publicPosts = posts.findPublicByIds(hits.hits.map { it.id }).mapNotNull { post -> post.id?.let { it to post } }.toMap()
        val pubMap = publications.findByPostIds(publicPosts.keys)

        // ES 只是候选来源，最终内容与可见性必须回到 PostgreSQL 的发布快照。
        val items = hits.hits.mapNotNull { hit ->
            val post = publicPosts[hit.id] ?: return@mapNotNull null
            val pub = pubMap[hit.id] ?: return@mapNotNull null
            SearchItem(
                id = hit.id,
                slug = pub.slug,
                title = pub.title,
                summaryHtml = text.cleanHighlight(hit.highlights["summary"])
                    ?: text.excerptHtml(pub.summary, query),
                bodySnippet = text.cleanHighlight(hit.highlights["body"])
                    ?: text.excerptHtml(text.sourceText(pub), query),
                tags = parseTags(pub.tags),
                publishedAt = pub.publishedAt,
            )
        }
        return SearchReaderPage(items, hits.total)
    }

    private fun rawSearch(query: String, page: Int, size: Int): SearchHitPage {
        val body = mapOf(
            "from" to (page - 1) * size,
            "size" to size,
            "track_total_hits" to true,
            "query" to mapOf(
                "bool" to mapOf(
                    "must" to listOf(
                        mapOf(
                            "multi_match" to mapOf(
                                "query" to query,
                                // tags 早就写进索引了（keyword），但查询没带上它 —— 于是「搜标签名」永远 0 条。
                                // 权重放在标题和摘要之间：标签是作者亲手选的词，比正文里偶然出现更可信。
                                "fields" to listOf("title^3", "tags^2", "summary^1.5", "body"),
                                "type" to "best_fields",
                                "minimum_should_match" to "70%",
                            ),
                        ),
                    ),
                    "filter" to listOf(
                        mapOf("term" to mapOf("docType" to "POST")),
                        mapOf("range" to mapOf("publishedAt" to mapOf("lte" to "now"))),
                    ),
                ),
            ),
            "highlight" to mapOf(
                "pre_tags" to listOf("<mark>"),
                "post_tags" to listOf("</mark>"),
                "encoder" to "html",
                "fields" to mapOf(
                    "title" to mapOf("number_of_fragments" to 0),
                    "summary" to mapOf("fragment_size" to 160, "number_of_fragments" to 1),
                    "body" to mapOf("fragment_size" to 180, "number_of_fragments" to 1),
                ),
            ),
            "sort" to listOf("_score", mapOf("publishedAt" to mapOf("order" to "desc"))),
        )
        val raw = client.request("POST", "/${props.articleIndex}/_search", client.json(body))
            ?: throw IllegalStateException("ES 搜索没有返回响应")
        val root = objectMapper.readTree(raw)
        val total = root.path("hits").path("total").path("value").asLong(0)
        val hits = root.path("hits").path("hits").mapNotNull { hit ->
            val id = hit.path("_id").asText().toLongOrNull() ?: return@mapNotNull null
            val highlights = hit.path("highlight").fields().asSequence().associate { (field, values) ->
                field to (values.firstOrNull()?.asText().orEmpty())
            }
            SearchHit(id, highlights)
        }
        return SearchHitPage(hits, total)
    }

    private fun parseTags(json: String): List<String> =
        runCatching { objectMapper.readValue(json, Array<String>::class.java).toList() }
            .getOrDefault(emptyList())
}