package com.abyssvstar.blog.note.repository

import com.abyssvstar.blog.note.domain.Note
import com.abyssvstar.blog.note.domain.NoteStatus
import com.abyssvstar.blog.shared.domain.Visibility
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper
import java.time.Instant

object PublishedNoteSpec {

    fun wrapper(): QueryWrapper<Note> = QueryWrapper<Note>()
        .eq("status", NoteStatus.PUBLISHED.name)
        .eq("visibility", Visibility.PUBLIC.name)
        .isNull("deleted_at")
        .le("published_at", Instant.now())
}