-- V14 短动态搜索同步状态。结构对齐 posts，但只服务 notes 的公开文章级文档。

ALTER TABLE notes
    ALTER COLUMN es_sync_status SET DEFAULT 'SKIPPED',
    ADD COLUMN es_sync_attempts int NOT NULL DEFAULT 0,
    ADD COLUMN es_next_retry_at timestamptz,
    ADD COLUMN es_last_error text;

UPDATE notes
   SET es_sync_status = CASE
         WHEN status = 'PUBLISHED' AND visibility = 'PUBLIC' AND deleted_at IS NULL AND published_at <= now()
           THEN 'PENDING'
         ELSE 'SKIPPED'
       END,
       es_next_retry_at = CASE
         WHEN status = 'PUBLISHED' AND visibility = 'PUBLIC' AND deleted_at IS NULL AND published_at <= now()
           THEN now()
         ELSE NULL
       END;

CREATE INDEX notes_es_due_idx ON notes (es_next_retry_at, id)
    WHERE es_sync_status IN ('PENDING', 'FAILED');