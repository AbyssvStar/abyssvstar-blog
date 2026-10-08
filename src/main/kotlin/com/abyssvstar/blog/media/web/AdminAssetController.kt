package com.abyssvstar.blog.media.web

import com.abyssvstar.blog.media.service.AssetService
import com.abyssvstar.blog.media.web.dto.AssetResponse
import com.abyssvstar.blog.shared.web.ApiResponse
import com.abyssvstar.blog.shared.web.BusinessException
import com.abyssvstar.blog.shared.web.ErrorCode
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

/**
 * 后台的图片上传。整个类都在 AuthInterceptor 与 CsrfInterceptor 的管辖范围内。
 *
 * 字节不落应用服务器：校验完直接进 MinIO，`assets` 表只存元数据。
 */
@RestController
@RequestMapping("/admin/api/assets")
class AdminAssetController(private val assets: AssetService) {

    @PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun upload(@RequestParam("file") file: MultipartFile): ApiResponse<AssetResponse> {
        if (file.isEmpty) throw BusinessException(ErrorCode.NOT_AN_IMAGE, "文件是空的")
        return ApiResponse.ok(assets.upload(file.originalFilename, file.bytes))
    }
}