package com.abyssvstar.blog.shared.persistence

import org.apache.ibatis.type.BaseTypeHandler
import org.apache.ibatis.type.JdbcType
import java.sql.CallableStatement
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.sql.Types

/**
 * PostgreSQL `jsonb` 列的读写。
 *
 * 直接把 String 当参数设进去，驱动会按 `varchar` 发送，PostgreSQL 拒绝：
 * `column "tags" is of type jsonb but expression is of type character varying`。
 *
 * 用 [Types.OTHER] 让驱动不做类型推断，由 PostgreSQL 按目标列的实际类型解析。
 * 这样不必引入 `org.postgresql.util.PGobject` —— 那个类要额外把 JDBC 驱动
 * 从 runtimeOnly 提到编译期。
 *
 * 读的时候 `getString` 拿到的就是 jsonb 的文本形式，直接用。
 */
class JsonbTypeHandler : BaseTypeHandler<String>() {

    override fun setNonNullParameter(
        ps: PreparedStatement,
        i: Int,
        parameter: String,
        jdbcType: JdbcType?,
    ) {
        ps.setObject(i, parameter, Types.OTHER)
    }

    override fun getNullableResult(rs: ResultSet, columnName: String): String? = rs.getString(columnName)

    override fun getNullableResult(rs: ResultSet, columnIndex: Int): String? = rs.getString(columnIndex)

    override fun getNullableResult(cs: CallableStatement, columnIndex: Int): String? = cs.getString(columnIndex)
}
