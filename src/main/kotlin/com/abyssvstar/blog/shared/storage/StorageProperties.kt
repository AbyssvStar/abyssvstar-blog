package com.abyssvstar.blog.shared.storage

import org.springframework.boot.context.properties.ConfigurationProperties

/** MinIO 对象存储。 */
@ConfigurationProperties(prefix = "blog.storage")
data class StorageProperties(
    /** MinIO 地址，容器内为 `http://minio:9000` */
    val endpoint: String = "http://localhost:9000",
    val accessKey: String = "",
    val secretKey: String = "",
    val bucket: String = "blog-media",
    /** 图片对外前缀，由 Nginx 反代到 MinIO */
    val publicBaseUrl: String = "http://localhost:9000/blog-media",
    /** 对象名前缀，多环境共用一个 bucket 时用于隔离 */
    val keyPrefix: String = "",
)
