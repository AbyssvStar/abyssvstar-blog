package com.abyssvstar.blog.sitebuild.service

import com.abyssvstar.blog.sitebuild.SiteBuildProperties
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration

/**
 * 真正去敲 GitHub `repository_dispatch` 的地方。
 *
 * 用 JDK 自带的 HttpClient，不引第三方 HTTP 客户端。
 * 两个容易踩的点：GitHub 要求带 User-Agent（缺了直接 403），超时要显式设（默认是无限等）。
 */
@Service
class SiteBuildDispatcher(private val props: SiteBuildProperties) {

    private val log = LoggerFactory.getLogger(javaClass)

    private val http: HttpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build()

    /** @return 能点进去看构建的链接 */
    fun dispatch(): String {
        val request = HttpRequest.newBuilder()
            .uri(URI.create("${props.apiBase.trimEnd('/')}/repos/${props.repository}/dispatches"))
            .timeout(Duration.ofSeconds(10))
            .header("Authorization", "Bearer ${props.token}")
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .header("User-Agent", "abyssvstar-blog")
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString("""{"event_type":"${props.eventType}"}"""))
            .build()

        val response = http.send(request, HttpResponse.BodyHandlers.ofString())
        if (response.statusCode() !in 200..299) {
            throw IllegalStateException("GitHub 返回 ${response.statusCode()}：${response.body().take(200)}")
        }
        log.info("已触发静态站重建 repo={} event={}", props.repository, props.eventType)

        // dispatch 的响应里没有 run id，先给 Actions 列表页；想要精确的运行链接得让 workflow 回传
        return "https://github.com/${props.repository}/actions"
    }
}