import Link from 'next/link'
import { posts, getAllTags } from '@/lib/blog'

export const metadata = {
  title: 'Blog — SweepGuard',
  description: 'Crypto security guides, wallet recovery tutorials, and Web3 safety tips from the SweepGuard team.',
  openGraph: {
    title: 'Blog — SweepGuard',
    description: 'Crypto security guides, wallet recovery tutorials, and Web3 safety tips.',
  },
}

export default function BlogPage() {
  const tags = getAllTags()

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <Link href="/" className="text-sm text-zinc-400 hover:text-white transition">← Home</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3">📝 Blog</h1>
          <p className="text-zinc-400 text-lg">Crypto security guides, wallet recovery tutorials, and Web3 safety tips.</p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tags.map(tag => (
            <span key={tag} className="text-xs px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-zinc-400">
              #{tag}
            </span>
          ))}
        </div>

        {/* Posts Grid */}
        <div className="grid gap-6">
          {posts.map((post, i) => (
            <article key={post.slug} className={`group ${i === 0 ? '' : ''}`}>
              <Link href={`/blog/${post.slug}`} className="block">
                <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-6 hover:border-green-500/20 transition-all duration-200">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      {i === 0 && (
                        <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 mb-3">
                          Latest
                        </span>
                      )}
                      <h2 className="text-xl font-semibold group-hover:text-green-400 transition-colors">
                        {post.title}
                      </h2>
                    </div>
                  </div>

                  <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-zinc-500">
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

                  <div className="flex flex-wrap gap-2 mt-4">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-xs px-2 py-1 rounded bg-white/[0.04] text-zinc-500 border border-white/[0.04]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>

        {/* Newsletter CTA */}
        <div className="mt-12 bg-[#111118] border border-white/[0.06] rounded-xl p-8 text-center">
          <h3 className="text-xl font-semibold mb-2">Stay Updated</h3>
          <p className="text-zinc-400 text-sm mb-4">Get the latest crypto security tips and SweepGuard updates.</p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-black font-semibold text-sm hover:brightness-110 transition"
          >
            Get Started Free →
          </Link>
        </div>
      </div>
    </main>
  )
}
