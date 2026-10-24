package com.abyssvstar.blog.metrics.service

import org.springframework.context.annotation.Profile
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
@Profile("!test")
class ViewAggregationScheduler(private val aggregation: ViewAggregationService) {

    @Scheduled(fixedDelay = 300_000, initialDelay = 30_000)
    fun flush() {
        aggregation.flush()
    }
}