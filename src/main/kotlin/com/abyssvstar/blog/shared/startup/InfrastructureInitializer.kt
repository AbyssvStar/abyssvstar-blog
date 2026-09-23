package com.abyssvstar.blog.shared.startup

import com.abyssvstar.blog.shared.storage.ObjectStorage
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Profile
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Component

/**
 * 启动期基础设施自检：**核心依赖不可用，这个进程就不该启动。**
 *
 * 判据一句话：**没有它，这个系统的核心功能还成立吗？**
 *
 * | 依赖 | 没有它会怎样 | 处理 |
 * |---|---|---|
 * | PostgreSQL | 没有任何内容可读可写 | fail fast —— DataSource 本来就连不上，不需要在这里检查 |
 * | **Redis** | 登录不了；只有作者能用的后台，"核心功能"就不成立 | **本类检查** |
 * | **MinIO** | 发不了带图的文章 | **本类检查** |
 * | ES | 还有 PG `pg_trgm` 兜底，搜索"**变差但成立**" | 降级 |
 * | LLM / Embedding | 只是增强，博客的核心是内容 | 降级 |
 *
 * 关键区分是「**变差**」还是「**不成立**」——ES 有刻意的双路径设计所以是前者，Redis 和 MinIO 没有兜底。
 *
 * ## 为什么集中在一个类，而不是每个服务各写一个 Initializer
 *
 * 「哪些依赖必须在启动时就可用」是一个**整体决策**。分散之后你就没法一眼看出
 * "这个进程到底依赖什么才能起来"，而那个问题恰恰是排障时第一个要问的。
 *
 * ## `@Profile("!test")`
 *
 * 上下文装配测试只验证 Bean 接线，不验证外部基础设施 —— 否则每个单测都得起 Redis + MinIO。
 * 启动期自检的职责是"生产环境下早失败"，不是"让单测变重"。
 */
@Component
@Profile("!test")
class InfrastructureInitializer(
    private val redis: StringRedisTemplate,
    private val storage: ObjectStorage,
) : ApplicationRunner {

    private val log = LoggerFactory.getLogger(javaClass)

    override fun run(args: ApplicationArguments) {
        verifyRedis()
        storage.verifyOrFail()
        log.info("启动期自检通过：Redis 可达，对象存储就绪（{}）", storage.publicUrl(""))
    }

    /**
     * 用一次 `EXISTS` 探活，而不是写探针 key —— **它是一次真实的往返，能证明连接可用，
     * 但不碰任何 key**。用 `PING` 需要走 `execute(RedisCallback)` 那套更啰嗦的 API，
     * 而收益完全相同。
     */
    private fun verifyRedis() {
        try {
            redis.hasKey(PROBE_KEY)
        } catch (ex: Exception) {
            throw IllegalStateException(
                "Redis 不可用（${redis.connectionFactory?.let { "已配置" } ?: "未配置"}）：${ex.message}",
                ex,
            )
        }
    }

    private companion object {
        /** 不会存在的 key —— 我们只要那次往返本身 */
        const val PROBE_KEY = "blog:startup-probe"
    }
}
