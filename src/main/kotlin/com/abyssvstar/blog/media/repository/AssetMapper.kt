package com.abyssvstar.blog.media.repository

import com.abyssvstar.blog.media.domain.Asset
import com.baomidou.mybatisplus.core.mapper.BaseMapper
import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param
import org.apache.ibatis.annotations.Select

/** 图片资源的数据访问。 */
@Mapper
interface AssetMapper : BaseMapper<Asset> {

    @Select(
        """
        SELECT (SELECT count(*) FROM posts WHERE cover_asset_id = #{id})
             + (SELECT count(*) FROM note_assets WHERE asset_id = #{id})
        """,
    )
    fun countReferences(@Param("id") id: Long): Long
}