package com.abyssvstar.blog.taxonomy.repository

import com.abyssvstar.blog.taxonomy.domain.Tag
import com.baomidou.mybatisplus.core.mapper.BaseMapper
import org.apache.ibatis.annotations.Mapper

/** 标签的数据访问。 */
@Mapper
interface TagMapper : BaseMapper<Tag>
