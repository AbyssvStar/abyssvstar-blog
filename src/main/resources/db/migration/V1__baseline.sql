-- V1 基线：管理员、图片资源、文章工作副本
-- 设计依据：docs/02-data-model.md §2、§5

CREATE TABLE admin_user
(
    id            bigserial PRIMARY KEY,
    username      text        NOT NULL,
    password_hash text        NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    last_login_at timestamptz
);
CREATE UNIQUE INDEX admin_user_username_uq ON admin_user (username);

-- 图片资源。文件本体在磁盘上，这里只存元数据。
CREATE TABLE assets
(
    id            bigserial PRIMARY KEY,
    path          text        NOT NULL,
    original_name text,
    mime          text        NOT NULL,
    size_bytes    bigint      NOT NULL,
    width         int,
    height        int,
    sha256        text        NOT NULL,
    variants      jsonb       NOT NULL DEFAULT '{}'::jsonb,
    deleted_at    timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX assets_sha_uq ON assets (sha256) WHERE deleted_at IS NULL;
CREATE INDEX assets_active_idx ON assets (created_at DESC) WHERE deleted_at IS NULL;

-- 文章【工作副本】。这里的内容永不直接上线，发布时才写入 post_publications。
-- 见 docs/04-domain-rules.md §2。
CREATE TABLE posts
(
    id                bigserial PRIMARY KEY,
    slug              text        NOT NULL,
    title             text        NOT NULL,
    summary           text,
    content_md        text        NOT NULL,
    cover_asset_id    bigint      REFERENCES assets (id) ON DELETE SET NULL,
    status            text        NOT NULL DEFAULT 'DRAFT',
    visibility        text        NOT NULL DEFAULT 'PUBLIC',
    publish_at        timestamptz,
    published_at      timestamptz,
    last_published_at timestamptz,
    view_count        bigint      NOT NULL DEFAULT 0,
    es_sync_status    text        NOT NULL DEFAULT 'PENDING',
    es_synced_at      timestamptz,
    -- 乐观锁版本号：自动保存用它检测「同一篇文章在两个标签页同时编辑」，
    -- 冲突时返回 409 而不是静默覆盖。见 docs/04-domain-rules.md §5
    version           bigint      NOT NULL DEFAULT 0,
    deleted_at        timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT posts_status_ck CHECK (status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED')),
    CONSTRAINT posts_visibility_ck CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
    -- 排期必须有时间，否则定时任务无从下手
    CONSTRAINT posts_scheduled_ck CHECK (status <> 'SCHEDULED' OR publish_at IS NOT NULL),
    CONSTRAINT posts_es_sync_ck CHECK (es_sync_status IN ('PENDING', 'SYNCED', 'FAILED', 'SKIPPED'))
);

CREATE UNIQUE INDEX posts_slug_uq ON posts (slug) WHERE deleted_at IS NULL;
CREATE INDEX posts_status_pub_idx ON posts (status, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX posts_updated_idx ON posts (updated_at DESC) WHERE deleted_at IS NULL;
