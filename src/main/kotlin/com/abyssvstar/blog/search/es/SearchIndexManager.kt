package com.abyssvstar.blog.search.es

import com.abyssvstar.blog.search.SearchProperties
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.core.io.ClassPathResource
import org.springframework.stereotype.Component

/** 三个索引的创建和配置校验。ES 可达但配置不一致时宁可启动失败，也不静默返回错结果。 */
@Component
class SearchIndexManager(
    private val props: SearchProperties,
    private val client: ElasticsearchHttpClient,
    private val objectMapper: ObjectMapper,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Volatile
    private var ready = false

    fun ensureIndices() {
        if (!props.enabled) return
        if (ready) return
        synchronized(this) {
            if (ready) return
            indexes.forEach { ensureIndex(it) }
            ready = true
            log.info("搜索索引就绪：{}、{}、{}", props.articleIndex, props.chunkIndex, props.qaIndex)
        }
    }

    fun invalidate() {
        ready = false
    }

    fun recreateContentIndices() {
        client.request("DELETE", "/${encode(props.articleIndex)}", allowNotFound = true, timeout = props.indexTimeout)
        client.request("DELETE", "/${encode(props.chunkIndex)}", allowNotFound = true, timeout = props.indexTimeout)
        ready = false
        ensureIndices()
    }

    fun count(index: String): Long {
        val body = client.request("GET", "/${encode(index)}/_count") ?: return 0
        return objectMapper.readTree(body).path("count").asLong(0)
    }

    private fun ensureIndex(definition: IndexDefinition) {
        val name = encode(definition.name)
        val exists = client.request("HEAD", "/$name", allowNotFound = true, timeout = props.indexTimeout) != null
        if (!exists) {
            val mapping = ClassPathResource(definition.mappingResource).inputStream.use { it.readBytes().toString(Charsets.UTF_8) }
            client.request("PUT", "/$name", mapping, timeout = props.indexTimeout)
            log.info("已创建搜索索引 {}", definition.name)
            return
        }
        validateMapping(definition)
    }

    private fun validateMapping(definition: IndexDefinition) {
        val raw = client.request("GET", "/${encode(definition.name)}/_mapping", timeout = props.indexTimeout)
            ?: throw IllegalStateException("搜索索引 ${definition.name} 的 mapping 读取不到")
        val root = objectMapper.readTree(raw)
        val mapping = root.path(definition.name).path("mappings")
        val meta = mapping.path("_meta")
        if (meta.path("schemaVersion").asInt() != SCHEMA_VERSION) {
            throw IllegalStateException("搜索索引 ${definition.name} 的 schemaVersion 不匹配")
        }
        if (meta.path("embeddingModel").asText() != props.embeddingModel) {
            throw IllegalStateException(
                "搜索索引 ${definition.name} 使用的模型 ${meta.path("embeddingModel").asText()} " +
                    "与配置 ${props.embeddingModel} 不一致",
            )
        }
        if (meta.path("embeddingDims").asInt() != props.embeddingDims) {
            throw IllegalStateException(
                "搜索索引 ${definition.name} 的向量维度 ${meta.path("embeddingDims").asInt()} " +
                    "与配置 ${props.embeddingDims} 不一致",
            )
        }
        definition.vectorField?.let { field ->
            val dims = mapping.path("properties").path(field).path("dims").asInt()
            if (dims != props.embeddingDims) {
                throw IllegalStateException(
                    "搜索索引 ${definition.name}.$field 的 dense_vector dims=$dims，配置要求 ${props.embeddingDims}",
                )
            }
        }
    }

    private fun encode(index: String): String = java.net.URLEncoder.encode(index, Charsets.UTF_8).replace("+", "%20")

    private data class IndexDefinition(
        val name: String,
        val mappingResource: String,
        val vectorField: String?,
    )

    private val indexes: List<IndexDefinition> by lazy {
        listOf(
            IndexDefinition(props.articleIndex, "search/blog_article.json", vectorField = null),
            IndexDefinition(props.chunkIndex, "search/blog_chunk.json", vectorField = "vector"),
            IndexDefinition(props.qaIndex, "search/blog_qa_cache.json", vectorField = "questionVector"),
        )
    }

    private companion object {
        const val SCHEMA_VERSION = 1
    }
}