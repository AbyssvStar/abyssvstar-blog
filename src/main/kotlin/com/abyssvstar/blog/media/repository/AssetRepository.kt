package com.abyssvstar.blog.media.repository

import com.abyssvstar.blog.media.domain.Asset
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper
import com.baomidou.mybatisplus.extension.plugins.pagination.Page
import org.springframework.stereotype.Component
import java.time.Instant

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

    fun pageActive(page: Int, size: Int): Page<Asset> =
        mapper.selectPage(
            Page(page.toLong(), size.toLong()),
            QueryWrapper<Asset>().isNull("deleted_at").orderByDesc("created_at", "id"),
        )

    fun softDelete(id: Long): Boolean =
        mapper.update(
            null,
            UpdateWrapper<Asset>()
                .eq("id", id)
                .isNull("deleted_at")
                .set("deleted_at", Instant.now()),
        ) > 0

    fun findDeletedBefore(cutoff: Instant): List<Asset> =
        mapper.selectList(
            QueryWrapper<Asset>()
                .isNotNull("deleted_at")
                .lt("deleted_at", cutoff)
                .orderByAsc("deleted_at")
                .last("LIMIT 100"),
        )

    fun hardDelete(id: Long): Boolean = mapper.deleteById(id) > 0

    fun isReferenced(id: Long): Boolean = mapper.countReferences(id) > 0

    fun referenceCount(id: Long): Long = mapper.countReferences(id)
}