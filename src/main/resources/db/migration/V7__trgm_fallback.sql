-- V7 降级搜索。
--
-- ES 挂掉时用 pg_trgm 在 PG 上兜底，把「搜索变差」和「搜索不可用」区分开。
-- CREATE EXTENSION 需要超级用户；官方 postgres 镜像里的 POSTGRES_USER 就是超级用户。

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX posts_title_trgm_idx ON posts USING GIN (title gin_trgm_ops);
CREATE INDEX posts_summary_trgm_idx ON posts USING GIN (summary gin_trgm_ops);
