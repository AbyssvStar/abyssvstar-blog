import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { ExportNote, ExportNoteImage } from '@/lib/content'
import { dateParts } from '@/lib/format'

/**
 * 动态列表的一条。这里刻意不用卡片：动态短、图多，卡片一画出来，
 * 内容短的条目右半就变成一片空白。改成"日期栏 + 正文"的日志行，
 * 行宽由发丝线收口，短内容就只是短内容。
 */
export function NoteEntry({ note, number }: { note: ExportNote; number: number }) {
  const date = dateParts(note.publishedAt)
  const shown = note.images.slice(0, 4)
  const rest = note.images.length - shown.length

  return (
    <article className="log-entry">
      <div className="log-entry__rail">
        <time className="log-entry__day" dateTime={note.publishedAt}>
          {date.day}
        </time>
        <span className="log-entry__weekday">
          {date.weekday} · {date.clock}
        </span>
      </div>

      <div className="log-entry__main">
        <p className="log-entry__text">{note.content}</p>

        {shown.length > 0 && (
          <div className={`log-entry__media log-entry__media--${shown.length}`}>
            {shown.map((image, index) => {
              const crop = shown.length === 1 ? tallCrop(image) : 0
              return (
                <figure
                  className={crop > 0 ? 'log-entry__shot log-entry__shot--tall' : 'log-entry__shot'}
                  key={image.id}
                  style={crop > 0 ? ({ '--shot-grow': String(1 + crop * 2) } as CSSProperties) : undefined}
                >
                  <NoteImage image={image} />
                  {index === shown.length - 1 && rest > 0 && (
                    <span className="log-entry__rest">+{rest}</span>
                  )}
                </figure>
              )
            })}
          </div>
        )}

        <div className="log-entry__foot">
          <Link href={`/notes/${note.id}/`} className="log-entry__more">
            查看动态<span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <span className="log-entry__no">#{String(number).padStart(2, '0')}</span>
    </article>
  )
}

/** 列表里只给缩略图，原图交给灯箱；所以这里不挂 width/height，避免把行高撑变形 */
function NoteImage({ image }: { image: ExportNoteImage }) {
  return (
    <img
      src={image.variants?.w800 ?? image.variants?.w400 ?? image.url}
      alt=""
      loading="lazy"
      decoding="async"
    />
  )
}

/**
 * 单张长图收进列表时裁掉上下各一点点：不裁的话一条动态能占两屏，
 * 裁太狠又会把长截图的信息切没，所以按「高出多少」来决定裁多少——
 * 越长的图裁得越多，同时因为缩放，图也随之变宽，看得更清楚。
 * 返回值是单侧裁掉的比例（0 表示不裁）。
 */
function tallCrop(image: ExportNoteImage): number {
  if (!image.width || !image.height) return 0
  const ratio = image.height / image.width
  if (ratio < 1.25) return 0
  return Math.min(0.22, 0.08 + (ratio - 1.25) * 0.11)
}
