package com.abyssvstar.blog.admin.repository

import com.abyssvstar.blog.admin.domain.AdminUser
import com.baomidou.mybatisplus.core.mapper.BaseMapper
import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param
import org.apache.ibatis.annotations.Select
import org.apache.ibatis.annotations.Update

/**
 * 管理员账号数据访问。
 *
 * 继承 `BaseMapper` 获得 `insert` / `selectById` / `selectCount` 等通用方法，
 * 只有自定义查询才写 `@Select`。
 */
@Mapper
interface AdminUserMapper : BaseMapper<AdminUser> {

    @Select(
        """
        SELECT id, username, password_hash, created_at, last_login_at
          FROM admin_user
         WHERE username = #{username}
        """,
    )
    fun findByUsername(@Param("username") username: String): AdminUser?

    /** 更新最后登录时间。 */
    @Update("UPDATE admin_user SET last_login_at = now() WHERE id = #{id}")
    fun touchLastLogin(@Param("id") id: Long): Int
}
