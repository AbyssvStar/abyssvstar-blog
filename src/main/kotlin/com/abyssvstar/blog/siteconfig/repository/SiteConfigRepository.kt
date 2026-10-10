package com.abyssvstar.blog.siteconfig.repository

import com.abyssvstar.blog.siteconfig.domain.SiteConfig
import org.springframework.stereotype.Component

/** 站点配置的读写入口。 */
@Component
class SiteConfigRepository(private val mapper: SiteConfigMapper) {

    fun find(): SiteConfig? = mapper.selectById(SiteConfig.ROW_ID)

    /**
     * 写那一行；行不在了就补回来。
     *
     * 没有直接用 updateById：影响 0 行时它一声不吭，症状是「保存成功，但改的东西没生效」——
     * 那种故障最难查。
     */
    fun save(config: SiteConfig): Boolean =
        if (mapper.updateById(config) > 0) true else mapper.insert(config) > 0
}