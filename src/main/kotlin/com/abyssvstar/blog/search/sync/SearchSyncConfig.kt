package com.abyssvstar.blog.search.sync

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor

@Configuration
class SearchSyncConfig {

    /** 单线程足够：索引写入不该和发布请求抢资源，也让重复请求天然串行。 */
    @Bean(name = ["searchSyncExecutor"])
    fun searchSyncExecutor(): ThreadPoolTaskExecutor =
        ThreadPoolTaskExecutor().apply {
            corePoolSize = 1
            maxPoolSize = 1
            queueCapacity = 200
            setThreadNamePrefix("search-sync-")
            setWaitForTasksToCompleteOnShutdown(true)
            setAwaitTerminationSeconds(10)
        }
}