import type { Metadata } from 'next'
import { CodeCopy } from '@/components/CodeCopy'
import { AboutProfile } from '@/components/AboutProfile'
import { HiddenTerminal } from '@/components/HiddenTerminal'
import { KonamiEgg } from '@/components/KonamiEgg'
import { getPosts, getSiteConfig } from '@/lib/content'
import { transformPostHtml } from '@/lib/markdown'
import { site } from '@/lib/site'

export async function generateMetadata(): Promise<Metadata> {
  const { description } = await getSiteConfig()
  return {
    title: '关于',
    description,
    alternates: { canonical: '/about/' },
  }
}

/**
 * 正文开头若就是「关于」这个一级标题，削掉它 —— banner 上已经有一个了。
 *
 * 只削这一种：作者另外写的一级标题（比如「欢迎来到我的个人博客」）要原样留着，
 * 否则会变成「我写的标题怎么不见了」这种最难查的问题。
 */
function stripRedundantTitle(html: string): string {
  return html.replace(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>\s*/, (whole: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '').trim()
    return /^(关于|关于我|about)$/i.test(text) ? '' : whole
  })
}

/**
 * 关于页。
 *
 * 版式是「大图 banner + 圆头像压边 + 一张大卡」：正文仍然来自后台的站点配置（Markdown，
 * 导出时已渲染成 HTML），这里只做两件事 —— 补标题锚点与代码配色，以及把内容摆进这套骨架里。
 *
 * 页面上还挂着两个玩的东西：头像（点它）和右下角的终端（按 ~）。都是客户端的，静态产物不变。
 */
export default async function AboutPage() {
  const [config, posts] = await Promise.all([getSiteConfig(), getPosts()])
  const body = stripRedundantTitle(config.aboutHtml).trim()
  const { html } = body ? await transformPostHtml(body) : { html: '' }

  return (
    <>
      <section className="about-hero">
        {config.aboutCoverUrl ? (
          // 封面图是后台传的 media 地址；静态导出没有图片优化服务，所以直接铺
          // eslint-disable-next-line @next/next/no-img-element
          <img className="about-hero__cover" src={config.aboutCoverUrl} alt="" />
        ) : (
          <div className="about-hero__fallback" aria-hidden="true" />
        )}
        <div className="about-hero__veil" aria-hidden="true" />

        <h1 className="about-hero__title">
          <span className="about-hero__typed">关于我</span>
        </h1>
      </section>

      <div className="wrap about-wrap">
        <div className="about-shell">
          <AboutProfile
            avatarUrl={config.aboutAvatarUrl || undefined}
            name={config.title}
            tagline={site.aboutTagline}
            github={site.github}
          />

          {html ? (
            <>
              <div className="md-body about-body" id="about-body" dangerouslySetInnerHTML={{ __html: html }} />
              <CodeCopy containerId="about-body" />
            </>
          ) : (
            <p className="faint" style={{ textAlign: 'center' }}>
              关于页还空着 —— 后台的「站点」页可以写它。
            </p>
          )}
        </div>

        <p className="about-hint">
          右下角有个终端（快捷键 <kbd>~</kbd>）哦
        </p>
      </div>

      <KonamiEgg />
      <HiddenTerminal posts={posts.map((post) => ({ slug: post.slug, title: post.title }))} />
    </>
  )
}