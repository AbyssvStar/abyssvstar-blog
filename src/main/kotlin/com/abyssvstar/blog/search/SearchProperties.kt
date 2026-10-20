package com.abyssvstar.blog.search

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

/** 搜索主路径与同步补偿的参数。ES 不可用时只影响搜索质量，不阻止应用启动。 */
@ConfigurationProperties(prefix = "blog.search")
data class SearchProperties(
    val enabled: Boolean = true,
    val url: String = "http://localhost:9200",
    val connectTimeout: Duration = Duration.ofSeconds(2),
    val requestTimeout: Duration = Duration.ofMillis(900),
    val indexTimeout: Duration = Duration.ofSeconds(10),
    val articleIndex: String = "blog_article",
    val chunkIndex: String = "blog_chunk",
    val qaIndex: String = "blog_qa_cache",
    val embeddingModel: String = "BAAI/bge-m3",
    val embeddingDims: Int = 1024,
    val syncScanIntervalMs: Long = 10_000,
    val syncInitialDelayMs: Long = 15_000,
    val syncBatchSize: Int = 20,
    val syncMaxRetryDelay: Duration = Duration.ofMinutes(15),
)