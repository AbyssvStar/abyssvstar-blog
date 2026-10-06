-- V4 短动态。
--
-- 动态不做工作副本 / 发布快照的分离：它是即时媒介，没有长草稿过程，
-- 编辑后直接改内容并触发构建。所以没有对应的 publications 表。

CREATE TABLE notes
(
    id             bigserial PRIMARY KEY,
    -- 纯文本，不支持 Markdown，保证「随手发」的心理成本最低
    content        text        NOT NULL,
    status         text        NOT NULL DEFAULT 'PUBLISHED',
    visibility     text        NOT NULL DEFAULT 'PUBLIC',
    published_at   timestamptz NOT NULL,
    view_count     bigint      NOT NULL DEFAULT 0,
    es_sync_status text        NOT NULL DEFAULT 'PENDING',
    es_synced_at   timestamptz,
    deleted_at     timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),

    -- 没有 SCHEDULED：动态不值得排队
    CONSTRAINT notes_status_ck CHECK (status IN ('PUBLISHED', 'ARCHIVED')),
    CONSTRAINT notes_visibility_ck CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
    CONSTRAINT notes_content_len_ck CHECK (char_length(content) <= 500),
    CONSTRAINT notes_es_sync_ck CHECK (es_sync_status IN ('PENDING', 'SYNCED', 'FAILED', 'SKIPPED'))
);

CREATE INDEX notes_status_pub_idx ON notes (status, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX notes_es_sync_idx ON notes (es_sync_status) WHERE es_sync_status <> 'SYNCED';

-- 动态配图，有顺序。每篇最多 4 张由应用层校验。
CREATE TABLE note_assets
(
    note_id    bigint NOT NULL REFERENCES notes (id) ON DELETE CASCADE,
    asset_id   bigint NOT NULL REFERENCES assets (id),
    sort_order int    NOT NULL DEFAULT 0,
    PRIMARY KEY (note_id, asset_id)
);
