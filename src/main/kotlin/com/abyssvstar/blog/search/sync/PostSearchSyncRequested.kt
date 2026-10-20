package com.abyssvstar.blog.search.sync

/** 发布事务提交后再去更新搜索索引，远程调用不占用内容事务。 */
data class PostSearchSyncRequested(val postId: Long)