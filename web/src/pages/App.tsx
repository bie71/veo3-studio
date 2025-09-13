import React, { useEffect, useMemo, useState } from 'react'
import { Studio } from '../sections/Studio'
import { PromptGenerator } from '../sections/PromptGenerator'
import { StoryboardBuilder } from '../sections/StoryboardBuilder'
import { GeminiStoryBuilder } from '../sections/GeminiStoryBuilder'

type Tab = 'studio' | 'prompt' | 'storyboard' | 'gemini'

export default function App() {
  const [tab, setTab] = useState<Tab>('studio')
  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    if (typeof window === 'undefined') return 'dark'
    const saved = localStorage.getItem('theme') as 'light'|'dark'|null
    if (saved) return saved
    const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefers ? 'dark' : 'light'
  })
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('gemini_key') || ''
  })

  useEffect(()=>{
    const el = document.documentElement
    if (theme === 'dark') el.classList.add('dark')
    else el.classList.remove('dark')
    localStorage.setItem('theme', theme)
  }, [theme])
  return (
    <div className="min-h-screen">
      <header className="bg-[var(--glass)] border-b border-[var(--border)] backdrop-blur-md sticky top-0 z-50 header-gradient">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
          <h1 className="text-xl font-semibold">VEO3 Studio</h1>
          <nav className="ml-auto flex gap-2 items-center flex-wrap">
            <button className={`btn ${tab==='studio'?'':'opacity-90'}`} onClick={()=>setTab('studio')}>Studio</button>
            <button className={`btn ${tab==='prompt'?'':'opacity-90'}`} onClick={()=>setTab('prompt')}>Prompt Generator</button>
            <button className={`btn ${tab==='storyboard'?'':'opacity-90'}`} onClick={()=>setTab('storyboard')} title="Build video segments (Veo 3)">VEO3 Storyboard</button>
            <button className={`btn ${tab==='gemini'?'':'opacity-90'}`} onClick={()=>setTab('gemini')} title="Text story builder (Gemini)">Gemini Story Builder</button>
            <div className="hidden md:flex items-center gap-2 ml-4">
              <input className="input" style={{width:280}} type="password" placeholder="GEMINI_API_KEY" value={apiKey}
                onChange={e=> setApiKey(e.target.value)} />
              <button className="btn" onClick={()=> { localStorage.setItem('gemini_key', apiKey); alert('API key saved locally'); }}>Save</button>
              <button className="btn" onClick={()=> { setApiKey(''); localStorage.removeItem('gemini_key'); alert('API key cleared'); }}>Clear</button>
            </div>
            <button aria-label="Toggle theme" className="ml-2 rounded p-2 border border-[var(--border)] bg-transparent hover:bg-[color:rgba(255,255,255,0.04)]"
              onClick={()=> setTheme(t => t==='dark' ? 'light' : 'dark')}>
              {theme==='dark' ? (
                // Sun icon
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                </svg>
              ) : (
                // Moon icon
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-screen-2xl mx-auto p-4 space-y-4">
        {tab==='studio' ? <Studio/> : tab==='prompt' ? <PromptGenerator/> : tab==='storyboard' ? <StoryboardBuilder/> : <GeminiStoryBuilder/>}
      </main>
    </div>
  )
}
