package com.abyssvstar.blog

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles

/**
 * 只验证「Spring 上下文能不能装配起来」。不碰 PostgreSQL、不碰 Redis。
 *
 * 它挡住的是一类**编译期完全发现不了**的问题：
 *  - 缺 Bean / 循环依赖
 *  - `@ConfigurationProperties` 绑定失败（比如 Duration 格式写错）
 *  - 两个控制器路由冲突
 *  - 拦截器注册路径写错
 *
 * 这些问题如果没有这个测试，就只能等到应用真的启动那一刻才暴露。
 *
 * 用 H2 只是为了给 `JdbcClient` 一个可用的 DataSource；
 * **Flyway 在测试里被关掉**，因为 V1–V8 是 PostgreSQL 专用的
 * （jsonb / timestamptz / GIN / 局部分区索引 / pg_trgm），必须在真 PG 上验证。
 *
 * 这个测试已经抓到过一个真实缺陷：`application.yml` 里若干环境变量没给默认值，
 * 导致缺配置时抛 `NumberFormatException: For input string: "${REDIS_PORT}"` 而不是
 * 一句能看懂的"缺少配置"。现在这些坐标都有默认值了。
 *
 * **profile 固定为 `test`**：`ObjectStorageInitializer` 之类"启动期基础设施自检"
 * 在 `test` profile 下不生效 —— 本测试只验证装配，不起 MinIO。
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = [
        "spring.datasource.url=jdbc:h2:mem:blog-context-test;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.flyway.enabled=false",
        // 初始化器会在启动时查 admin_user 表，而测试里没有表
        "blog.admin.auto-initialize=false",
    ],
)
@ActiveProfiles("test")
class ApplicationContextTest {

    @Test
    fun `Spring 上下文可以装配起来`() {
        // 能跑到这里，就说明所有 Bean、配置绑定、路由映射和拦截器装配都通过了
    }
}
