package com.abyssvstar.blog.note.service

import com.abyssvstar.blog.note.repository.NoteRepository
import com.abyssvstar.blog.search.SearchProperties
import org.springframework.context.annotation.Profile
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
@Profile("!test")
class NoteSearchSyncScanner(
    private val props: SearchProperties,
    private val notes: NoteRepository,
    private val sync: NoteSearchSyncService,
) {

    @Scheduled(
        fixedDelayString = "\${blog.search.sync-scan-interval-ms:10000}",
        initialDelayString = "\${blog.search.sync-initial-delay-ms:15000}",
    )
    fun scan() {
        if (!props.enabled) return
        notes.findDueSearchSync(props.syncBatchSize).forEach { note -> note.id?.let(sync::enqueue) }
    }
}