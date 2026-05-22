import { notFound } from 'next/navigation'
import Link from 'next/link'
import { posts, getPostBySlug, getAllSlugs } from '@/lib/blog'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}

  return {
    title: `${post.title} — SweepGuard Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  }
}

function renderMarkdown(md: string): string {
  let html = md
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-black/40 rounded-lg p-4 text-sm text-emerald-400 overflow-x-auto my-4"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-black/30 px-1.5 py-0.5 rounded text-xs text-emerald-400">$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-8 mb-3 text-white">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-10 mb-4 text-white border-b border-white/[0.06] pb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mb-6 text-white">$1</h1>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    // Italic
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-blue-400 hover:underline">$1</a>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 mb-1 text-zinc-300">$1</li>')
    // Ordered lists
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 mb-1 text-zinc-300 list-decimal">$2</li>')
    // Tables (basic)
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim())
      if (cells.every(c => /^[\s-]+$/.test(c))) return '' // separator row
      const row = cells.map(c => `<td class="px-3 py-2 border border-white/[0.06]">${c.trim()}</td>`).join('')
      return `<tr>${row}</tr>`
    })
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="border-white/[0.06] my-8" />')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p class="mb-4 text-zinc-300 leading-relaxed">')
    // Single newlines within paragraphs
    .replace(/\n/g, '<br />')

  // Wrap list items
  html = html.replace(/(<li[^>]*>.*<\/li>)/gs, '<ul class="list-disc mb-4 space-y-1">$1</ul>')
  // Clean up nested ul tags
  html = html.replace(/<\/ul>\s*<ul[^>]*>/g, '')

  // Wrap in paragraph
  html = `<p class="mb-4 text-zinc-300 leading-relaxed">${html}</p>`

  return html
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const html = renderMarkdown(post.content)

  // Find adjacent posts
  const currentIndex = posts.findIndex(p => p.slug === slug)
  const prevPost = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null
  const nextPost = currentIndex > 0 ? posts[currentIndex - 1] : null

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <Link href="/blog" className="text-sm text-zinc-400 hover:text-white transition">← Blog</Link>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map(tag => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-zinc-400">
                #{tag}
              </span>
            ))}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{post.title}</h1>

          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            <span>·</span>
            <span>{post.readTime} read</span>
          </div>
        </header>

        {/* Content */}
        <div
          className="prose-custom"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Author / CTA */}
        <div className="mt-12 pt-8 border-t border-white/[0.06]">
          <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Protect Your Wallet with SweepGuard</h3>
            <p className="text-zinc-400 text-sm mb-4">Multi-chain monitoring, Flashbots recovery, and real-time alerts.</p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-black font-semibold text-sm hover:brightness-110 transition"
            >
              Get Started Free →
            </Link>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-8 grid grid-cols-2 gap-4">
          {prevPost ? (
            <Link href={`/blog/${prevPost.slug}`} className="group bg-[#111118] border border-white/[0.06] rounded-xl p-4 hover:border-green-500/20 transition">
              <span className="text-xs text-zinc-500">← Previous</span>
              <p className="text-sm font-medium mt-1 group-hover:text-green-400 transition-colors">{prevPost.title}</p>
            </Link>
          ) : <div />}
          {nextPost ? (
            <Link href={`/blog/${nextPost.slug}`} className="group bg-[#111118] border border-white/[0.06] rounded-xl p-4 text-right hover:border-green-500/20 transition">
              <span className="text-xs text-zinc-500">Next →</span>
              <p className="text-sm font-medium mt-1 group-hover:text-green-400 transition-colors">{nextPost.title}</p>
            </Link>
          ) : <div />}
        </nav>
      </article>
    </main>
  )
}
