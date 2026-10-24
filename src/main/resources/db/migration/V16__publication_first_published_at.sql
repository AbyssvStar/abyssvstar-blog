-- 发布时间表示文章首次公开，不随每次「更新线上」改变。
-- 旧代码把 published_at 当成最近发布会时间反复覆盖；快照行的 created_at
-- 只在第一次发布时写入，后续 updateById 不会碰它，因此可以用它回填首发时间。

UPDATE post_publications
SET published_at = created_at
WHERE published_at IS DISTINCT FROM created_at;

UPDATE posts p
SET published_at = pp.created_at
FROM post_publications pp
WHERE p.id = pp.post_id
  AND p.published_at IS DISTINCT FROM pp.created_at;
-- 搜索索引里也存着旧的“最近发布”时间，启动后让补偿任务按新首发时间重建一次。
UPDATE posts p
SET es_sync_status = 'PENDING',
    es_sync_attempts = 0,
    es_next_retry_at = now(),
    es_last_error = NULL
WHERE p.status = 'PUBLISHED'
  AND p.visibility = 'PUBLIC'
  AND p.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM post_publications pp WHERE pp.post_id = p.id);