package com.abyssvstar.blog.search.es

import com.abyssvstar.blog.search.SearchProperties
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Component

/** ES 不可达时保持降级；可达但插件或 dims 配置错误时，启动必须失败并指出原因。 */
@Component
@Profile("!test")
class SearchIndexInitializer(
    private val props: SearchProperties,
    private val client: ElasticsearchHttpClient,
    private val indices: SearchIndexManager,
) : ApplicationRunner {

    private val log = LoggerFactory.getLogger(javaClass)

    override fun run(args: ApplicationArguments) {
        if (!props.enabled) {
            log.info("搜索功能已关闭")
            return
        }
        if (!client.ping()) {
            log.warn("Elasticsearch 暂不可达，搜索将使用 PostgreSQL 降级路径")
            return
        }
        try {
            indices.ensureIndices()
        } catch (ex: Exception) {
            throw IllegalStateException("Elasticsearch 可达，但搜索索引初始化失败：${ex.message}", ex)
        }
    }
}