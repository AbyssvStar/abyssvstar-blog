package com.abyssvstar.blog

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles

/**
 * 只验证「Spring 上下文能不能装配起来」，不碰 PostgreSQL、不碰 Redis。
 *
 * 它挡住的是一类编译期发现不了的问题：缺 Bean、循环依赖、配置绑定失败
 * （比如 Duration 格式写错）、路由冲突、拦截器注册路径写错。
 *
 * 用 H2 只是为了给 DataSource 一个可用连接。Flyway 关掉，因为迁移脚本是
 * PostgreSQL 专用的（jsonb / timestamptz / GIN / pg_trgm），必须在真 PG 上验证。
 *
 * profile 固定为 `test`：启动期的 Redis / MinIO 自检在这个 profile 下不生效。
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
