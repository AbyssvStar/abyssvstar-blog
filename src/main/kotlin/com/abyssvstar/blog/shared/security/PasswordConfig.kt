package com.abyssvstar.blog.shared.security

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder

/**
 * 密码哈希。
 *
 * 设计初稿写的是 Argon2id，实现时改为 BCrypt(cost=12)：
 *  - Spring Security 的 Argon2PasswordEncoder 依赖 BouncyCastle，为单管理员账号多引一个加密库收益极低
 *  - OWASP 推荐顺序为 Argon2id > scrypt > bcrypt > PBKDF2，bcrypt cost=12 仍在可接受范围内
 *  - 哈希自带算法前缀（$2a$ / $argon2id$），将来换算法可平滑迁移
 * 详见 docs/08-deployment-and-ops.md §7。
 */
@Configuration
class PasswordConfig {

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder(BCRYPT_STRENGTH)

    companion object {
        /** 12 ≈ 每次校验 200–300ms（目标机器上），足以让离线爆破不划算 */
        const val BCRYPT_STRENGTH = 12
    }
}
