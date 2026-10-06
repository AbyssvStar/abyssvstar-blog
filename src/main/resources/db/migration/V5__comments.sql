-- V5 留言板。最简形态，不做嵌套回复。
--
-- post_id 为 NULL 表示站内留言板（不挂在任何文章下）。
-- 只存 ip_hash，绝不存原始 IP。

CREATE TABLE comments
(
    id              bigserial PRIMARY KEY,
    post_id         bigint REFERENCES posts (id),
    author_name     text        NOT NULL,
    -- 可选，永不公开，仅用于将来的回复通知
    author_email    text,
    content         text        NOT NULL,
    -- 默认待审：这是反垃圾最有效的一道
    status          text        NOT NULL DEFAULT 'PENDING',
    ip_hash         text        NOT NULL,
    user_agent_hash text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    reviewed_at     timestamptz,

    CONSTRAINT comments_status_ck CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SPAM')),
    CONSTRAINT comments_name_len_ck CHECK (char_length(author_name) <= 30),
    CONSTRAINT comments_content_len_ck CHECK (char_length(content) <= 1000)
);

CREATE INDEX comments_status_idx ON comments (status, created_at DESC);
CREATE INDEX comments_post_idx ON comments (post_id, status, created_at DESC);
CREATE INDEX comments_ip_idx ON comments (ip_hash, created_at DESC);
