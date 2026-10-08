package com.abyssvstar.blog.media.repository

import com.abyssvstar.blog.media.domain.Asset
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper
import org.springframework.stereotype.Component

/** 图片资源的查询入口。软删除（`deleted_at`）的过滤收在这里。 */
@Component
class AssetRepository(private val mapper: AssetMapper) {

    fun insert(asset: Asset) {
        mapper.insert(asset)
    }

    /** 按内容哈希取未删除的那一条：同一个文件重复上传走它，不再存第二份。 */
    fun findActiveBySha(sha256: String): Asset? =
        mapper.selectOne(QueryWrapper<Asset>().isNull("deleted_at").eq("sha256", sha256))

    fun findActiveById(id: Long): Asset? =
        mapper.selectOne(QueryWrapper<Asset>().isNull("deleted_at").eq("id", id))
}