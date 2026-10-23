-- V15 短动态留言。一条留言最多只能挂在文章或动态其中一个目标上。

ALTER TABLE comments
    ADD COLUMN note_id bigint REFERENCES notes (id);

ALTER TABLE comments
    ADD CONSTRAINT comments_single_target_ck
    CHECK (NOT (post_id IS NOT NULL AND note_id IS NOT NULL));

CREATE INDEX comments_note_idx ON comments (note_id, status, created_at DESC);