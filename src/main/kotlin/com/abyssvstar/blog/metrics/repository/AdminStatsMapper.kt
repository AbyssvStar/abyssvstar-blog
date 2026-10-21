package com.abyssvstar.blog.metrics.repository

import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Select

@Mapper
interface AdminStatsMapper {

    @Select("SELECT coalesce(sum(cost_estimate), 0) FROM ai_usage WHERE created_at >= date_trunc('month', now())")
    fun monthAiCost(): Double

    @Select("SELECT count(*) FROM ai_usage WHERE created_at >= date_trunc('month', now())")
    fun monthAiCalls(): Long

    @Select("SELECT count(*) FROM ai_usage WHERE created_at >= date_trunc('month', now()) AND cached")
    fun monthAiCached(): Long

    @Select("SELECT coalesce(sum(count), 0) FROM daily_views WHERE date >= current_date - 6")
    fun viewsLast7Days(): Long

    @Select("SELECT count(*) FROM posts WHERE status = 'PUBLISHED' AND deleted_at IS NULL")
    fun publishedPosts(): Long

    @Select("SELECT count(*) FROM notes WHERE status = 'PUBLISHED' AND deleted_at IS NULL")
    fun publishedNotes(): Long

    @Select("SELECT count(*) FROM comments WHERE status = 'PENDING'")
    fun pendingComments(): Long
}