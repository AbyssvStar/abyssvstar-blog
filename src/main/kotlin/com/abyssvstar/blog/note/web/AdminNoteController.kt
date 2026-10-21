package com.abyssvstar.blog.note.web

import com.abyssvstar.blog.note.service.NoteService
import com.abyssvstar.blog.note.web.dto.CreateNoteRequest
import com.abyssvstar.blog.note.web.dto.NoteResponse
import com.abyssvstar.blog.note.web.dto.UpdateNoteRequest
import com.abyssvstar.blog.shared.web.ApiResponse
import com.abyssvstar.blog.shared.web.PageData
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/admin/api/notes")
class AdminNoteController(private val notes: NoteService) {

    @GetMapping
    fun list(
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ApiResponse<PageData<NoteResponse>> =
        ApiResponse.ok(notes.listForAdmin(page.coerceAtLeast(1), size.coerceIn(1, MAX_PAGE_SIZE)))

    @GetMapping("/{id}")
    fun detail(@PathVariable id: Long): ApiResponse<NoteResponse> = ApiResponse.ok(notes.getForAdmin(id))

    @PostMapping
    fun create(@Valid @RequestBody body: CreateNoteRequest): ApiResponse<NoteResponse> =
        ApiResponse.ok(notes.create(body))

    @PatchMapping("/{id}")
    fun update(@PathVariable id: Long, @Valid @RequestBody body: UpdateNoteRequest): ApiResponse<NoteResponse> =
        ApiResponse.ok(notes.update(id, body))

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ApiResponse<Unit> {
        notes.delete(id)
        return ApiResponse.ok()
    }

    @PostMapping("/{id}/archive")
    fun archive(@PathVariable id: Long): ApiResponse<NoteResponse> = ApiResponse.ok(notes.archive(id))

    @PostMapping("/{id}/restore")
    fun restore(@PathVariable id: Long): ApiResponse<NoteResponse> = ApiResponse.ok(notes.restore(id))

    private companion object {
        const val MAX_PAGE_SIZE = 100
    }
}