package com.abyssvstar.blog.taxonomy.repository

import com.abyssvstar.blog.taxonomy.domain.Tag
import com.baomidou.mybatisplus.core.mapper.BaseMapper
import org.apache.ibatis.annotations.Insert
import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param

/** 标签的数据访问。 */
@Mapper
interface TagMapper : BaseMapper<Tag> {

    /**
     * 插入，冲突（同名或同 slug）就什么都不做、返回 0。
     *
     * 不能用「insert 失败再 catch」：PostgreSQL 里语句报错会让整个事务进入 aborted，
     * 后面连 SELECT 都会报 25P02。
     */
    @Insert("INSERT INTO tags (name, slug) VALUES (#{name}, #{slug}) ON CONFLICT DO NOTHING")
    fun insertIgnore(@Param("name") name: String, @Param("slug") slug: String): Int
}
