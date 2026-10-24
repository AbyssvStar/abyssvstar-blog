package com.abyssvstar.blog.taxonomy.repository

import org.apache.ibatis.annotations.Delete
import org.apache.ibatis.annotations.Insert
import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param
import org.apache.ibatis.annotations.Select

/** 文章与标签的关联行。主键是 (post_id, tag_id)，没有自增 id，所以不用 BaseMapper。 */
@Mapper
interface PostTagMapper {

    /** 重复关联直接忽略，让「保存文章」可以幂等地重写标签。 */
    @Insert("INSERT INTO post_tags (post_id, tag_id) VALUES (#{postId}, #{tagId}) ON CONFLICT DO NOTHING")
    fun link(@Param("postId") postId: Long, @Param("tagId") tagId: Long): Int

    /** 清掉一篇文章的全部关联。删标签只删关联行，posts 一行不动。 */
    @Delete("DELETE FROM post_tags WHERE post_id = #{postId}")
    fun unlinkAll(@Param("postId") postId: Long): Int

    @Delete("DELETE FROM post_tags WHERE tag_id = #{tagId}")
    fun unlinkByTag(@Param("tagId") tagId: Long): Int

    @Select("SELECT tag_id FROM post_tags WHERE post_id = #{postId}")
    fun findTagIds(@Param("postId") postId: Long): List<Long>

    @Select("SELECT tag_id, count(*) FROM post_tags GROUP BY tag_id")
    fun countByTag(): List<TagCount>

    @Select(
        """
        <script>
        SELECT post_id, tag_id FROM post_tags
         WHERE post_id IN
         <foreach item="id" collection="postIds" open="(" separator="," close=")">#{id}</foreach>
        </script>
        """,
    )
    fun findLinks(@Param("postIds") postIds: Collection<Long>): List<PostTagLink>
}

/** 关联行的投影，只用来批量取标签。 */
data class PostTagLink(
    var postId: Long = 0,
    var tagId: Long = 0,
)

data class TagCount(
    var tagId: Long = 0,
    var count: Long = 0,
)
