package com.abyssvstar.blog.metrics.repository

import com.abyssvstar.blog.metrics.domain.ContentViewType
import org.apache.ibatis.annotations.Insert
import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param
import org.apache.ibatis.annotations.Select
import org.apache.ibatis.annotations.Update
import java.time.LocalDate

@Mapper
interface ViewMapper {

    @Insert(
        """
        INSERT INTO daily_views (date, content_type, content_id, count)
        VALUES (#{date}, #{type}, #{id}, #{amount})
        ON CONFLICT (date, content_type, content_id)
        DO UPDATE SET count = daily_views.count + EXCLUDED.count
        """,
    )
    fun upsertDaily(
        @Param("date") date: LocalDate,
        @Param("type") type: ContentViewType,
        @Param("id") id: Long,
        @Param("amount") amount: Long,
    ): Int

    @Update("UPDATE posts SET view_count = view_count + #{amount} WHERE id = #{id} AND deleted_at IS NULL")
    fun addPostViews(@Param("id") id: Long, @Param("amount") amount: Long): Int

    @Update("UPDATE notes SET view_count = view_count + #{amount} WHERE id = #{id} AND deleted_at IS NULL")
    fun addNoteViews(@Param("id") id: Long, @Param("amount") amount: Long): Int

    @Select(
        """
        SELECT EXISTS (
          SELECT 1 FROM posts
           WHERE id = #{id} AND status = 'PUBLISHED' AND visibility = 'PUBLIC'
             AND deleted_at IS NULL AND published_at IS NOT NULL AND published_at <= now()
        )
        """,
    )
    fun postIsPublic(@Param("id") id: Long): Boolean

    @Select(
        """
        SELECT EXISTS (
          SELECT 1 FROM notes
           WHERE id = #{id} AND status = 'PUBLISHED' AND visibility = 'PUBLIC'
             AND deleted_at IS NULL AND published_at <= now()
        )
        """,
    )
    fun noteIsPublic(@Param("id") id: Long): Boolean

    @Select("SELECT coalesce((SELECT view_count FROM posts WHERE id = #{id} AND deleted_at IS NULL), 0)")
    fun postViews(@Param("id") id: Long): Long

    @Select("SELECT coalesce((SELECT view_count FROM notes WHERE id = #{id} AND deleted_at IS NULL), 0)")
    fun noteViews(@Param("id") id: Long): Long
}