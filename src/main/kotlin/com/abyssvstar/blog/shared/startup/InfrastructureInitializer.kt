package com.abyssvstar.blog.shared.startup

import com.abyssvstar.blog.shared.storage.ObjectStorage
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Profile
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Component

/**
 * 启动期基础设施自检：核心依赖不可用，这个进程就不该启动。
 *
 * 判据是「没有它，核心功能还成立吗」：
 *  - PostgreSQL / Redis / MinIO —— 不成立，fail fast。PG 由 DataSource 自己失败，Redis 和 MinIO 在这里查。
 *  - ES / LLM —— 变差但成立，运行期降级。
 *
 * 集中在一个类里而不是每个依赖配一个 Initializer：「这个进程依赖什么才能起来」
 * 是一个整体决策，分散了反而看不出来。
 *
 * 标注 `@Profile("!test")`：上下文装配测试只验 Bean 接线，不该被迫拉起 Redis 和 MinIO。
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

    /** 用一次 `EXISTS` 探活：它是一次真实往返，能证明连接可用，又不碰任何 key。 */
    private fun verifyRedis() {
        try {
            redis.hasKey(PROBE_KEY)
        } catch (ex: Exception) {
            throw IllegalStateException("Redis 不可用：${ex.message}", ex)
        }
    }

    private companion object {
        /** 一个不会存在的 key，要的只是那次往返 */
        const val PROBE_KEY = "blog:startup-probe"
    }
}
