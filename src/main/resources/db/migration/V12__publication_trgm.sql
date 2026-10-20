-- V12 降级搜索的 trigram 索引改到发布快照上。
--
-- 公开搜索绝不能读 posts（工作副本）：改了标题但没发布的文章不该被搜到。
-- 查询时仍然 join posts 套 PublishedContentSpec，这里只负责让 ILIKE / similarity 有索引可用。
CREATE INDEX post_publications_title_trgm_idx ON post_publications USING GIN (title gin_trgm_ops);
CREATE INDEX post_publications_summary_trgm_idx ON post_publications USING GIN (summary gin_trgm_ops);

-- 旧的建在工作副本上，删掉，免得后来的人顺手用错
DROP INDEX IF EXISTS posts_title_trgm_idx;
DROP INDEX IF EXISTS posts_summary_trgm_idx;