-- V3 标签。
--
-- post_tags 关联的是文章【工作副本】。删标签只删关联行，posts 一行不动。

CREATE TABLE tags
(
    id         bigserial PRIMARY KEY,
    name       text        NOT NULL,
    slug       text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT tags_name_len_ck CHECK (char_length(name) BETWEEN 1 AND 20)
);
CREATE UNIQUE INDEX tags_name_uq ON tags (name);
CREATE UNIQUE INDEX tags_slug_uq ON tags (slug);

CREATE TABLE post_tags
(
    post_id bigint NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    tag_id  bigint NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- 主键是 (post_id, tag_id)，按 tag_id 反查文章用不上它，标签页需要
CREATE INDEX post_tags_tag_idx ON post_tags (tag_id);
