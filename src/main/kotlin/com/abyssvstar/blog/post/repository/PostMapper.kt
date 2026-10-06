package com.abyssvstar.blog.post.repository

import com.abyssvstar.blog.post.domain.Post
import com.baomidou.mybatisplus.core.mapper.BaseMapper
import org.apache.ibatis.annotations.Mapper

/** 文章工作副本的数据访问。通用 CRUD 来自 [BaseMapper]，查询条件统一在 [PostRepository]。 */
@Mapper
interface PostMapper : BaseMapper<Post>
