package com.abyssvstar.blog.note.repository

import org.apache.ibatis.annotations.Delete
import org.apache.ibatis.annotations.Insert
import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param
import org.apache.ibatis.annotations.Select

@Mapper
interface NoteAssetMapper {

    @Delete("DELETE FROM note_assets WHERE note_id = #{noteId}")
    fun deleteAll(@Param("noteId") noteId: Long): Int

    @Insert("INSERT INTO note_assets (note_id, asset_id, sort_order) VALUES (#{noteId}, #{assetId}, #{sortOrder})")
    fun link(@Param("noteId") noteId: Long, @Param("assetId") assetId: Long, @Param("sortOrder") sortOrder: Int): Int

    @Select("SELECT asset_id FROM note_assets WHERE note_id = #{noteId} ORDER BY sort_order, asset_id")
    fun findAssetIds(@Param("noteId") noteId: Long): List<Long>

    @Select(
        """
        <script>
        SELECT note_id, asset_id, sort_order
          FROM note_assets
         WHERE note_id IN
         <foreach item="id" collection="noteIds" open="(" separator="," close=")">#{id}</foreach>
         ORDER BY note_id, sort_order, asset_id
        </script>
        """,
    )
    fun findLinks(@Param("noteIds") noteIds: Collection<Long>): List<NoteAssetLink>
}

data class NoteAssetLink(
    var noteId: Long = 0,
    var assetId: Long = 0,
    var sortOrder: Int = 0,
)