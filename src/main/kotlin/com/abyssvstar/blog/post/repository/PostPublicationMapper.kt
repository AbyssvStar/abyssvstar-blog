package com.abyssvstar.blog.post.repository

import com.abyssvstar.blog.post.domain.PostPublication
import com.baomidou.mybatisplus.core.mapper.BaseMapper
import org.apache.ibatis.annotations.Mapper

/** 发布快照的数据访问。主键是 post_id，不是自增 id。 */
@Mapper
interface PostPublicationMapper : BaseMapper<PostPublication>
