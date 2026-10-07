package com.abyssvstar.blog.sitebuild.repository

import com.abyssvstar.blog.sitebuild.domain.SiteBuild
import com.baomidou.mybatisplus.core.mapper.BaseMapper
import org.apache.ibatis.annotations.Mapper

/** 构建请求的数据访问。 */
@Mapper
interface SiteBuildMapper : BaseMapper<SiteBuild>
