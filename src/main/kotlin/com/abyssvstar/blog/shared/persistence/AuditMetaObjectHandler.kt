package com.abyssvstar.blog.shared.persistence

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler
import org.apache.ibatis.reflection.MetaObject
import org.springframework.stereotype.Component
import java.time.Instant

/**
 * 自动填 `created_at` / `updated_at`。
 *
 * 数据库只给了 DEFAULT now()，没有 ON UPDATE 触发器；而 `updateById` 默认不写
 * 未设置的字段，忘了赋值 `updated_at` 就不会变。统一在这里填，免得漏。
 */
@Component
class AuditMetaObjectHandler : MetaObjectHandler {

    override fun insertFill(metaObject: MetaObject) {
        val now = Instant.now()
        strictInsertFill(metaObject, CREATED_AT, Instant::class.java, now)
        strictInsertFill(metaObject, UPDATED_AT, Instant::class.java, now)
    }

    override fun updateFill(metaObject: MetaObject) {
        strictUpdateFill(metaObject, UPDATED_AT, Instant::class.java, Instant.now())
    }

    private companion object {
        const val CREATED_AT = "createdAt"
        const val UPDATED_AT = "updatedAt"
    }
}
