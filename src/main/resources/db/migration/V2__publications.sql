-- V2 发布快照。与 posts 是 1:1，只保留最新一次发布。
--
-- 这张表是「发布语义」：静态导出和 ES 索引都只读它，天然一致。
-- 标签存 jsonb 而不是关联 post_tags —— post_tags 关联的是工作副本，
-- 若已发布标签也放那儿，「改标签」就会立刻改变线上展示，违背发布语义。

CREATE TABLE post_publications
(
    post_id         bigint PRIMARY KEY REFERENCES posts (id) ON DELETE CASCADE,
    slug            text        NOT NULL,
    title           text        NOT NULL,
    summary         text        NOT NULL,
    html            text        NOT NULL,
    cover_url       text,
    tags            jsonb       NOT NULL DEFAULT '[]'::jsonb,
    word_count      int         NOT NULL,
    reading_minutes int         NOT NULL,
    -- 发布时工作副本的 sha256，用来判定「有未发布的修改」
    source_hash     text        NOT NULL,
    published_at    timestamptz NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX post_publications_slug_uq ON post_publications (slug);
CREATE INDEX post_publications_pub_idx ON post_publications (published_at DESC);
CREATE INDEX post_publications_tags_idx ON post_publications USING GIN (tags);
