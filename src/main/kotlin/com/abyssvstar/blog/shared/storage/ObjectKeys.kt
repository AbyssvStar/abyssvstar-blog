package com.abyssvstar.blog.shared.storage

import java.time.LocalDate
import java.util.UUID

/**
 * 对象名的生成规则。
 *
 * `2026/09/3f2a…c1.png` —— **按年月分目录**
 *
 * 用 UUID 而不是原始文件名：**用户提供的文件名永远不参与路径拼装**。
 * 原始文件名只作为展示用元数据存库。
 */
object ObjectKeys {

    /** 只允许字母数字扩展名，防止把 `../` 之类的东西带进对象名。 */
    private val SAFE_EXTENSION = Regex("^[a-z0-9]{1,10}$")

    fun newKey(extension: String, date: LocalDate = LocalDate.now()): String {
        val ext = extension.lowercase().removePrefix(".")
        require(SAFE_EXTENSION.matches(ext)) { "非法的扩展名：'$extension'" }
        val name = UUID.randomUUID().toString().replace("-", "")
        return "%04d/%02d/%s.%s".format(date.year, date.monthValue, name, ext)
    }
}
