'use client'

import { useState, useEffect } from 'react'
import { LOCALES, getLocale, setLocale, type Locale } from '@/lib/i18n'

export default function LanguageSwitcher() {
  const [current, setCurrent] = useState<Locale>('en')
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setCurrent(getLocale())
  }, [])

  const handleSelect = (locale: Locale) => {
    setLocale(locale)
    setCurrent(locale)
    setOpen(false)
    // Force page reload for translations to take effect
    window.location.reload()
  }

  if (!mounted) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-xs text-white/50 hover:text-white transition-colors"
      >
        🌐 {LOCALES[current].nativeName}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#1a1a25] border border-white/[0.1] rounded-xl shadow-xl z-50 min-w-[160px]">
          {Object.entries(LOCALES).map(([key, locale]) => (
            <button
              key={key}
              onClick={() => handleSelect(key as Locale)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-white/[0.05] transition-colors first:rounded-t-xl last:rounded-b-xl ${
                key === current ? 'text-green-400 bg-green-500/10' : 'text-white/60'
              }`}
            >
              {locale.nativeName}
              <span className="text-white/30 text-xs ml-2">({locale.name})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
