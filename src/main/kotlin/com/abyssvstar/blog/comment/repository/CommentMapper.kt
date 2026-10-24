package com.abyssvstar.blog.comment.repository

import com.abyssvstar.blog.comment.domain.Comment
import com.baomidou.mybatisplus.core.mapper.BaseMapper
import org.apache.ibatis.annotations.Mapper

@Mapper
interface CommentMapper : BaseMapper<Comment>