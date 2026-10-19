-- V11 发布快照保留 Markdown 原文。
--
-- G4 的 chunk 切分要按 Markdown 结构（标题栈、代码块不可切）来做，而快照之前只有渲染好的 HTML。
-- 可空：已经发布过的老快照没有这份原文，不要拿工作副本回填（那会把未发布的修改"洗"成已发布）；
-- 老快照由切分逻辑退化成从 HTML 提取文本，下一次发布自然补上。
ALTER TABLE post_publications
    ADD COLUMN content_md text;