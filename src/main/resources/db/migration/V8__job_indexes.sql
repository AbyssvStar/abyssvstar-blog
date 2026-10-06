-- V8 定时任务用的索引。

-- 定时发布扫描：每分钟找 status = SCHEDULED 且到点的文章。
-- 判断条件是 publish_at <= now() 而不是「刚好等于」，所以服务器停机跨过了
-- 发布时间也不会漏发。
CREATE INDEX posts_scheduled_idx ON posts (status, publish_at) WHERE status = 'SCHEDULED';

-- ES 补偿扫描：找所有没同步成功的，重推。ES 挂掉期间积压的靠它补上。
CREATE INDEX posts_es_sync_idx ON posts (es_sync_status) WHERE es_sync_status <> 'SYNCED';
