package com.abyssvstar.blog.note.web

import com.abyssvstar.blog.note.service.NoteService
import com.abyssvstar.blog.note.web.dto.PublicNoteResponse
import com.abyssvstar.blog.shared.web.ApiResponse
import com.abyssvstar.blog.shared.web.PageData
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/notes")
class PublicNoteController(private val notes: NoteService) {

    @GetMapping
    fun list(
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
    ): ApiResponse<PageData<PublicNoteResponse>> =
        ApiResponse.ok(notes.listPublic(page.coerceAtLeast(1), size.coerceIn(1, MAX_PAGE_SIZE)))

    @GetMapping("/{id}")
    fun detail(@PathVariable id: Long): ApiResponse<PublicNoteResponse> =
        ApiResponse.ok(notes.getPublic(id))

    private companion object {
        const val MAX_PAGE_SIZE = 50
    }
}