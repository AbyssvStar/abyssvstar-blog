-- V13 搜索同步的可恢复状态。
--
-- 只有 PENDING / FAILED 会被补偿任务扫描。草稿、私密、归档和软删除内容默认 SKIPPED，
-- 不给启动后的补偿任务制造无意义的索引工作。

ALTER TABLE posts
    ALTER COLUMN es_sync_status SET DEFAULT 'SKIPPED';

ALTER TABLE posts
    ADD COLUMN es_sync_attempts int         NOT NULL DEFAULT 0,
    ADD COLUMN es_next_retry_at timestamptz,
    ADD COLUMN es_last_error     text;

-- 升级前已有的公开文章需要补建索引；其余状态明确标成不需要同步。
UPDATE posts p
   SET es_sync_status   = 'PENDING',
       es_sync_attempts = 0,
       es_next_retry_at = now(),
       es_last_error    = NULL
 WHERE p.deleted_at IS NULL
   AND p.status = 'PUBLISHED'
   AND p.visibility = 'PUBLIC'
   AND p.published_at IS NOT NULL
   AND p.published_at <= now()
   AND EXISTS (SELECT 1 FROM post_publications pp WHERE pp.post_id = p.id);

UPDATE posts
   SET es_sync_status   = 'SKIPPED',
       es_sync_attempts = 0,
       es_next_retry_at = NULL,
       es_last_error    = NULL
 WHERE es_sync_status <> 'PENDING';

CREATE INDEX posts_es_due_idx ON posts (es_next_retry_at, id)
    WHERE es_sync_status IN ('PENDING', 'FAILED');