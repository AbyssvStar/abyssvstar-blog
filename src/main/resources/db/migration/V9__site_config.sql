-- V9 站点配置。

-- 单行表：站点配置只有一份，主键用 CHECK 钉死在 1 上 ——
-- 「配置表里冒出第二行」这种没有语义的状态，直接从库这一层挡掉。
CREATE TABLE site_config
(
    id          smallint PRIMARY KEY,
    title       text        NOT NULL,
    description text        NOT NULL,
    about_md    text        NOT NULL DEFAULT '',
    updated_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT site_config_single_row_ck CHECK (id = 1)
);

-- 先插一行，后台打开「站点」页就有东西可改，而不是面对一片空白。
INSERT INTO site_config (id, title, description, about_md)
VALUES (1,
        'AbyssvStar',
        'AbyssvStar 的个人站点：技术文章、随手笔记，以及一个能问「我写过什么」的检索。',
        '# 关于

这一页的正文在后台的「站点」页里写，用 Markdown，保存后站点会自动重建。

（还没写。）');