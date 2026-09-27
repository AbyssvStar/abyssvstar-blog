package com.abyssvstar.blog.admin

import com.abyssvstar.blog.admin.domain.AdminUser
import com.abyssvstar.blog.admin.repository.AdminUserMapper
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component

/**
 * 首次启动时按配置创建管理员账号。
 *
 * 放在应用启动而不是 Flyway 迁移里：迁移脚本做不了 BCrypt 哈希，
 * 把密码写进 SQL 也会永久留在迁移历史里。
 *
 * 账号已存在时不覆盖密码 —— 改密码应当是显式操作，不是重启的副作用。
 * `blog.admin.auto-initialize=false` 可以关掉，上下文装配测试也依赖这个开关。
 */
@Component
class AdminUserInitializer(
    private val adminUsers: AdminUserMapper,
    private val passwordEncoder: PasswordEncoder,
    private val props: AdminProperties,
) : ApplicationRunner {

    private val log = LoggerFactory.getLogger(javaClass)

    override fun run(args: ApplicationArguments) {
        if (!props.autoInitialize) {
            log.debug("管理员自动建号已关闭（blog.admin.auto-initialize=false）")
            return
        }

        if (adminUsers.selectCount(null) > 0L) {
            log.info("管理员账号已存在，跳过初始化")
            return
        }

        if (props.password.isBlank()) {
            log.warn(
                "数据库中没有管理员账号，且 blog.admin.password 未配置 —— 后台将无法登录。" +
                    "请设置 BLOG_ADMIN_PASSWORD 环境变量后重启。",
            )
            return
        }

        val admin = AdminUser(
            username = props.username,
            passwordHash = passwordEncoder.encode(props.password),
        )
        adminUsers.insert(admin)
        log.info("已创建管理员账号 id={} username={}", admin.id, props.username)
    }
}
