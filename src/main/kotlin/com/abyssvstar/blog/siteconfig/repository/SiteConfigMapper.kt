package com.abyssvstar.blog.siteconfig.repository

import com.abyssvstar.blog.siteconfig.domain.SiteConfig
import com.baomidou.mybatisplus.core.mapper.BaseMapper
import org.apache.ibatis.annotations.Mapper

/** 站点配置的数据访问。只有一行。 */
@Mapper
interface SiteConfigMapper : BaseMapper<SiteConfig>