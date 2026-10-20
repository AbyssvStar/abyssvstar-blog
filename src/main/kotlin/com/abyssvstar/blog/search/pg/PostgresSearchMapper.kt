package com.abyssvstar.blog.search.pg

import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param
import org.apache.ibatis.annotations.Select
import java.time.Instant

@Mapper
interface PostgresSearchMapper {

    @Select(
        """
        SELECT pp.post_id,
               pp.slug,
               pp.title,
               pp.summary,
               pp.tags::text AS tags,
               pp.published_at,
               pp.content_md,
               pp.html
          FROM post_publications pp
          JOIN posts p ON p.id = pp.post_id
         WHERE p.status = 'PUBLISHED'
           AND p.visibility = 'PUBLIC'
           AND p.deleted_at IS NULL
           AND p.published_at IS NOT NULL
           AND p.published_at <= now()
           AND (
                pp.title ILIKE #{pattern} ESCAPE '\'
                OR pp.summary ILIKE #{pattern} ESCAPE '\'
                OR COALESCE(pp.content_md, '') ILIKE #{pattern} ESCAPE '\'
                OR pp.html ILIKE #{pattern} ESCAPE '\'
           )
         ORDER BY GREATEST(similarity(pp.title, #{query}), similarity(pp.summary, #{query})) DESC,
                  pp.published_at DESC,
                  pp.post_id DESC
         LIMIT #{limit} OFFSET #{offset}
        """,
    )
    fun search(
        @Param("query") query: String,
        @Param("pattern") pattern: String,
        @Param("limit") limit: Int,
        @Param("offset") offset: Int,
    ): List<PostgresSearchRow>

    @Select(
        """
        SELECT count(*)
          FROM post_publications pp
          JOIN posts p ON p.id = pp.post_id
         WHERE p.status = 'PUBLISHED'
           AND p.visibility = 'PUBLIC'
           AND p.deleted_at IS NULL
           AND p.published_at IS NOT NULL
           AND p.published_at <= now()
           AND (
                pp.title ILIKE #{pattern} ESCAPE '\'
                OR pp.summary ILIKE #{pattern} ESCAPE '\'
                OR COALESCE(pp.content_md, '') ILIKE #{pattern} ESCAPE '\'
                OR pp.html ILIKE #{pattern} ESCAPE '\'
           )
        """,
    )
    fun count(@Param("pattern") pattern: String): Long
}

data class PostgresSearchRow(
    var postId: Long = 0,
    var slug: String = "",
    var title: String = "",
    var summary: String = "",
    var tags: String = "[]",
    var publishedAt: Instant? = null,
    var contentMd: String? = null,
    var html: String = "",
)