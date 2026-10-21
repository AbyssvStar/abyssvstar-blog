package com.abyssvstar.blog.metrics.web

import com.abyssvstar.blog.metrics.domain.ContentViewType
import com.abyssvstar.blog.metrics.service.ViewService
import com.abyssvstar.blog.metrics.web.dto.ViewCountResponse
import com.abyssvstar.blog.metrics.web.dto.ViewRecordRequest
import com.abyssvstar.blog.shared.web.ApiResponse
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/views")
class ViewController(private val views: ViewService) {

    @PostMapping
    fun record(@Valid @RequestBody body: ViewRecordRequest, request: HttpServletRequest): ResponseEntity<Void> {
        views.record(body.type, body.id, request)
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build()
    }

    @GetMapping
    fun count(
        @RequestParam type: ContentViewType,
        @RequestParam id: Long,
    ): ApiResponse<ViewCountResponse> = ApiResponse.ok(views.count(type, id))
}