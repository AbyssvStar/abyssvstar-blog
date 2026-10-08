package com.abyssvstar.blog.media.repository

import com.abyssvstar.blog.media.domain.Asset
import com.baomidou.mybatisplus.core.mapper.BaseMapper
import org.apache.ibatis.annotations.Mapper

/** 图片资源的数据访问。 */
@Mapper
interface AssetMapper : BaseMapper<Asset>