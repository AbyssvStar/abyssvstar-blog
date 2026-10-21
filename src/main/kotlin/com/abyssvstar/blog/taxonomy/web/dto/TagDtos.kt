package com.abyssvstar.blog.taxonomy.web.dto

data class TagAdminResponse(
    val id: Long,
    val name: String,
    val slug: String,
    val postCount: Long,
)