-- V10 关于页的两张图。

-- 封面图与头像存 URL（指向 /media/** 的快照），不建 assets 外键：
-- 后台换图就是换一个 URL，不需要为「这张图属于站点配置」再加一张关联表。
-- 两列都可空 —— 没设就是没有，页面上退回渐变底与默认头像。
ALTER TABLE site_config
    ADD COLUMN about_cover_url  text,
    ADD COLUMN about_avatar_url text;