package com.abyssvstar.blog.search.pg

import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param
import org.apache.ibatis.annotations.Select
import java.time.Instant

@Mapper
interface PostgresSearchMapper {

    @Select(
        """
        WITH matched AS (
          SELECT 'POST'::text AS type,
                 pp.post_id AS content_id,
                 pp.slug,
                 pp.title,
                 pp.summary,
                 pp.tags,
                 pp.published_at,
                 pp.content_md,
                 pp.html,
                 GREATEST(similarity(pp.title, #{query}), similarity(pp.summary, #{query})) AS score
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
                  OR pp.tags::text ILIKE #{pattern} ESCAPE '\'
             )
          UNION ALL
          SELECT 'NOTE'::text,
                 n.id,
                 ''::text,
                 ''::text,
                 n.content,
                 '[]'::jsonb,
                 n.published_at,
                 n.content,
                 ''::text,
                 similarity(n.content, #{query})
            FROM notes n
           WHERE n.status = 'PUBLISHED'
             AND n.visibility = 'PUBLIC'
             AND n.deleted_at IS NULL
             AND n.published_at <= now()
             AND n.content ILIKE #{pattern} ESCAPE '\'
        )
        SELECT type, content_id, slug, title, summary, tags::text AS tags,
               published_at, content_md, html
          FROM matched
         ORDER BY score DESC, published_at DESC, content_id DESC
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
        SELECT
          (SELECT count(*)
             FROM post_publications pp
             JOIN posts p ON p.id = pp.post_id
            WHERE p.status = 'PUBLISHED'
              AND p.visibility = 'PUBLIC'
              AND p.deleted_at IS NULL
              AND p.published_at <= now()
              AND (pp.title ILIKE #{pattern} ESCAPE '\'
                OR pp.summary ILIKE #{pattern} ESCAPE '\'
                OR COALESCE(pp.content_md, '') ILIKE #{pattern} ESCAPE '\'
                OR pp.html ILIKE #{pattern} ESCAPE '\'
                OR pp.tags::text ILIKE #{pattern} ESCAPE '\'))
          +
          (SELECT count(*)
             FROM notes n
            WHERE n.status = 'PUBLISHED'
              AND n.visibility = 'PUBLIC'
              AND n.deleted_at IS NULL
              AND n.published_at <= now()
              AND n.content ILIKE #{pattern} ESCAPE '\')
        """,
    )
    fun count(@Param("pattern") pattern: String): Long
}

data class PostgresSearchRow(
    var type: String = "POST",
    var contentId: Long = 0,
    var slug: String = "",
    var title: String = "",
    var summary: String = "",
    var tags: String = "[]",
    var publishedAt: Instant? = null,
    var contentMd: String? = null,
    var html: String = "",
)