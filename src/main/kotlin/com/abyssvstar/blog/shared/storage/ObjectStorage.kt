package com.abyssvstar.blog.shared.storage

import com.abyssvstar.blog.shared.web.BusinessException
import com.abyssvstar.blog.shared.web.ErrorCode
import io.minio.BucketExistsArgs
import io.minio.MakeBucketArgs
import io.minio.MinioClient
import io.minio.PutObjectArgs
import io.minio.RemoveObjectArgs
import io.minio.SetBucketPolicyArgs
import io.minio.StatObjectArgs
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component

/**
 * 对象存储（MinIO 自建图床）的访问入口。
 *
 * `MinioClient` 是 lazy 的，因为构造它并不建立连接；真正的可用性由启动期的
 * [verifyOrFail] 保证，失败直接终止启动。
 */
@Component
class ObjectStorage(private val props: StorageProperties) {

    private val log = LoggerFactory.getLogger(javaClass)

    private val client: MinioClient by lazy {
        MinioClient.builder()
            .endpoint(props.endpoint)
            .credentials(props.accessKey, props.secretKey)
            .build()
    }

    /** 凭据是否配了。启动期由 [verifyOrFail] 强制要求，只有测试会绕过。 */
    val isConfigured: Boolean
        get() = props.accessKey.isNotBlank() && props.secretKey.isNotBlank()

    /** 上传并返回可直接写进 Markdown 的公开 URL。 */
    fun put(objectName: String, bytes: ByteArray, contentType: String): String {
        requireConfigured()
        val key = withPrefix(objectName)
        try {
            client.putObject(
                PutObjectArgs.builder()
                    .bucket(props.bucket)
                    .`object`(key)
                    .stream(bytes.inputStream(), bytes.size.toLong(), -1L)
                    .contentType(contentType)
                    .build(),
            )
        } catch (ex: Exception) {
            // 启动时已经自检过，运行期在这里失败通常意味着 MinIO 中途掉了。
            // 给调用方一个 503 就够了，不必让整个应用崩掉。
            log.error("对象存储写入失败 bucket={} key={}", props.bucket, key, ex)
            throw BusinessException(ErrorCode.SERVICE_UNAVAILABLE, "图片存储暂时不可用")
        }
        log.debug("对象已上传 bucket={} key={} bytes={}", props.bucket, key, bytes.size)
        return publicUrl(objectName)
    }

    fun delete(objectName: String) {
        requireConfigured()
        val key = withPrefix(objectName)
        try {
            client.removeObject(
                RemoveObjectArgs.builder().bucket(props.bucket).`object`(key).build(),
            )
        } catch (ex: Exception) {
            log.error("对象存储删除失败 bucket={} key={}", props.bucket, key, ex)
            throw BusinessException(ErrorCode.SERVICE_UNAVAILABLE, "图片存储暂时不可用")
        }
    }

    /** 存在性检查，不抛异常：清理任务靠它判断文件是否还在。 */
    fun exists(objectName: String): Boolean {
        if (!isConfigured) return false
        return runCatching {
            client.statObject(
                StatObjectArgs.builder().bucket(props.bucket).`object`(withPrefix(objectName)).build(),
            )
            true
        }.getOrDefault(false)
    }

    /** 公开访问 URL。图片要能不经鉴权永久访问，所以 bucket 是公开只读的。 */
    fun publicUrl(objectName: String): String =
        "${props.publicBaseUrl.trimEnd('/')}/${withPrefix(objectName)}"

    /** 确保 bucket 存在；只在新建时顺带设置公开只读策略。 */
    fun ensureBucket() {
        requireConfigured()
        val bucket = props.bucket
        val exists = client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build())
        if (exists) {
            log.debug("bucket 已存在，不修改其策略：{}", bucket)
            return
        }
        client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build())
        client.setBucketPolicy(
            SetBucketPolicyArgs.builder().bucket(bucket).config(publicReadPolicy(bucket)).build(),
        )
        log.info("已创建 bucket {} 并设为公开只读", bucket)
    }

    /**
     * 启动期自检，不降级，失败就终止启动。
     *
     * 抛 `IllegalStateException` 而非 `BusinessException`：这不是一次请求的业务失败，
     * 而是进程不该启动，要让 Spring Boot 终止启动流程。
     */
    fun verifyOrFail() {
        if (!isConfigured) {
            throw IllegalStateException(
                "对象存储未配置：请设置 BLOG_STORAGE_ACCESS_KEY / BLOG_STORAGE_SECRET_KEY" +
                    "（.env 里的 MINIO_ROOT_USER / MINIO_ROOT_PASSWORD）",
            )
        }
        try {
            ensureBucket()
        } catch (ex: Exception) {
            throw IllegalStateException(
                "对象存储不可用（${props.endpoint}，bucket=${props.bucket}）：${ex.message}",
                ex,
            )
        }
    }

    private fun withPrefix(objectName: String): String {
        val prefix = props.keyPrefix.trim().trim('/')
        return if (prefix.isEmpty()) objectName else "$prefix/$objectName"
    }

    private fun requireConfigured() {
        if (!isConfigured) {
            throw BusinessException(
                ErrorCode.SERVICE_UNAVAILABLE,
                "对象存储未配置（blog.storage.access-key / secret-key），图片功能不可用",
            )
        }
    }

    /** 只允许匿名 `GetObject`：能读图，不能列目录，不能写，不能删。 */
    private fun publicReadPolicy(bucket: String): String = """
        {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Principal": {"AWS": ["*"]},
              "Action": ["s3:GetObject"],
              "Resource": ["arn:aws:s3:::$bucket/*"]
            }
          ]
        }
    """.trimIndent()
}
