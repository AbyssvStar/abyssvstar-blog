package com.abyssvstar.blog.shared.persistence

import com.baomidou.mybatisplus.annotation.DbType
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor
import com.baomidou.mybatisplus.extension.plugins.inner.OptimisticLockerInnerInterceptor
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * MyBatis-Plus 拦截器装配。
 *
 * - 乐观锁：让带 `@Version` 的实体在 UPDATE 时自动变成
 *   `SET version = version + 1 WHERE version = ?`，影响行数为 0 即冲突
 * - 分页：`selectPage` 靠它生成 LIMIT / OFFSET，避免手写 `.last(...)`
 */
@Configuration
class MyBatisPlusConfig {

    @Bean
    fun mybatisPlusInterceptor(): MybatisPlusInterceptor =
        MybatisPlusInterceptor().apply {
            addInnerInterceptor(OptimisticLockerInnerInterceptor())
            addInnerInterceptor(PaginationInnerInterceptor(DbType.POSTGRE_SQL))
        }
}
