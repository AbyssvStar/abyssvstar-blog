package com.abyssvstar.blog.shared.security

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder

/**
 * 密码哈希。
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
