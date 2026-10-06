-- V6 度量与构建记录。

-- 阅读量按天聚合。定时任务每 5 分钟把 Redis 增量落到这里。
CREATE TABLE daily_views
(
    date         date   NOT NULL,
    content_type text   NOT NULL,
    content_id   bigint NOT NULL,
    count        int    NOT NULL DEFAULT 0,

    PRIMARY KEY (date, content_type, content_id),
    CONSTRAINT daily_views_type_ck CHECK (content_type IN ('POST', 'NOTE'))
);

-- AI 调用成本账本。后台首页直接显示「本月已花费 ¥X.XX」，缓存命中率也从这里算。
CREATE TABLE ai_usage
(
    id                bigserial PRIMARY KEY,
    feature           text          NOT NULL,
    model             text,
    prompt_tokens     int,
    completion_tokens int,
    cost_estimate     numeric(10, 6),
    cached            boolean       NOT NULL DEFAULT false,
    ref               text,
    created_at        timestamptz   NOT NULL DEFAULT now(),

    CONSTRAINT ai_usage_feature_ck
        CHECK (feature IN ('SUMMARY', 'TAGS', 'RELATED', 'RAG_QA', 'EMBEDDING'))
);
CREATE INDEX ai_usage_created_idx ON ai_usage (created_at DESC);

-- 静态站构建触发记录。写入和实际触发是分开的：发布时只 INSERT 一条 PENDING，
-- 由防抖定时任务合并成一次 repository_dispatch。
CREATE TABLE site_builds
(
    id           bigserial PRIMARY KEY,
    reason       text,
    status       text        NOT NULL DEFAULT 'PENDING',
    requested_at timestamptz NOT NULL DEFAULT now(),
    fired_at     timestamptz,
    run_url      text,
    error        text,

    CONSTRAINT site_builds_status_ck
        CHECK (status IN ('PENDING', 'FIRED', 'FAILED', 'CANCELLED'))
);

CREATE INDEX site_builds_status_idx ON site_builds (status, requested_at);
