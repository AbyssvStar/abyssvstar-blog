package com.abyssvstar.blog.note.repository

import com.abyssvstar.blog.note.domain.Note
import com.baomidou.mybatisplus.core.mapper.BaseMapper
import org.apache.ibatis.annotations.Mapper

@Mapper
interface NoteMapper : BaseMapper<Note>