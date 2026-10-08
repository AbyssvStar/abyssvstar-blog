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
 *
 * **这里两个方法只有在实体字段声明了 fill 时才会被调用**：MyBatis-Plus 用
 * `TableInfo.isWithInsertFill()` / `isWithUpdateFill()` 做门控，而它们是由 `@TableField(fill = ...)`
 * 聚合出来的。所以 fill 声明和本类是一对，删掉任意一边，时间戳就会静默地不再更新。
 */
@Component
class AuditMetaObjectHandler : MetaObjectHandler {

    override fun insertFill(metaObject: MetaObject) {
        val now = Instant.now()
        /*
         * 用 setFieldValByName 而不是 strictInsertFill：带 fill 的列会被 MyBatis-Plus
         * 无条件拼进 INSERT（不套 `<if test="et.xxx != null">`），值必须由这里给出，
         * 不能指望「字段为空就不写、让数据库的 DEFAULT now() 兜底」。
         *
         * 它内部会检查 hasSetter，所以只有 created_at、没有 updated_at 的实体
         * （AdminUser、Tag）也不会出事。
         */
        setFieldValByName(CREATED_AT, now, metaObject)
        setFieldValByName(UPDATED_AT, now, metaObject)
    }

    override fun updateFill(metaObject: MetaObject) {
        /*
         * 这里**不能**用 strictUpdateFill。
         *
         * 它的语义是「字段为 null 时才填」，而 updateById 传进来的实体是从库里读出来的，
         * updated_at 早已有旧值 —— 于是填充永远不生效，MP 把旧时间原样写回去，
         * 「最后修改」就永远等于创建时间。
         *
         * setFieldValByName 是无条件覆盖，内部还会检查 hasSetter，
         * 所以没有这个字段的实体（如 Tag、SiteBuild）也不会出事。
         */
        setFieldValByName(UPDATED_AT, Instant.now(), metaObject)
    }

    private companion object {
        const val CREATED_AT = "createdAt"
        const val UPDATED_AT = "updatedAt"
    }
}
