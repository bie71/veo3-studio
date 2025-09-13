import React, { useMemo, useState } from 'react'
import { toast } from '../lib/toast'

interface Character { id:number; name:string; role:string; traits:string }
interface Dialog { id:number; characterId:number; text:string }
interface Scene { id:number; heading:string; description:string; dialogs: Dialog[] }

export function GeminiStoryBuilder() {
  const [title, setTitle] = useState('Konten Pendek: Inspirasi Pagi di Jakarta')
  const GENRES = ['Slice of life','Motivational','Comedy','Drama','Educational','Product explainer','Tutorial']
  const TONES = ['Hangat, optimistis, natural','Lucu, ringan','Serius, informatif','Inspiratif, elegan','Santai, ramah']
  const AUDIENCES = ['Remaja & dewasa muda di Indonesia','Umum (all ages)','Profesional/pekerja kantoran','Pecinta teknologi','Kreator konten']

  const [genre, setGenre] = useState(GENRES[0])
  const [tone, setTone] = useState(TONES[0])
  const [audience, setAudience] = useState(AUDIENCES[0])
  const [goal, setGoal] = useState('Memberi semangat di pagi hari')
  const [constraints, setConstraints] = useState('Tanpa merek/brand, tanpa watermark, aman untuk semua umur')

  const [characters, setCharacters] = useState<Character[]>([
    { id:1, name:'Rina', role:'Protagonis', traits:'Ramah, pekerja keras' },
    { id:2, name:'Budi', role:'Teman', traits:'Humoris, suportif' }
  ])
  const [scenes, setScenes] = useState<Scene[]>([
    { id:1, heading:'Pagi, apartemen Rina', description:'Rina membuka jendela; cahaya pagi masuk. Ia menata meja kerja dan menyeduh kopi.', dialogs:[
      { id:1, characterId:1, text:'Pagi ini aku mau mulai lebih fokus dan bersyukur.' }
    ]},
    { id:2, heading:'Jalan menuju halte', description:'Rina bertemu Budi. Mereka bertukar sapa singkat sebelum berangkat.', dialogs:[
      { id:2, characterId:2, text:'Semangat ya, Rin! Hari ini pasti menyenangkan.' },
      { id:3, characterId:1, text:'Makasih, Bud! Kamu juga ya.' }
    ]}
  ])

  const addCharacter = () => setCharacters(cs=>[...cs, { id:(cs.at(-1)?.id||0)+1, name:'Karakter Baru', role:'', traits:'' }])
  const removeCharacter = (id:number) => {
    setCharacters(cs=>cs.filter(c=>c.id!==id))
    setScenes(ss=> ss.map(s=> ({...s, dialogs: s.dialogs.filter(d=> d.characterId!==id)})))
  }

  const addScene = () => setScenes(ss=>[...ss, { id:(ss.at(-1)?.id||0)+1, heading:'Scene Baru', description:'', dialogs:[] }])
  const addDialog = (sid:number) => setScenes(ss=> ss.map(s=> s.id===sid ? ({...s, dialogs:[...s.dialogs, { id:(s.dialogs.at(-1)?.id||0)+1, characterId: characters[0]?.id||1, text:'' }]}) : s))
  const removeDialog = (sid:number, did:number) => setScenes(ss=> ss.map(s=> s.id===sid ? ({...s, dialogs:s.dialogs.filter(d=> d.id!==did)}) : s))

  const storyID = useMemo(()=>{
    const chars = characters.map(c=> `- ${c.name} (${c.role}): ${c.traits}`).join('\n')
    const sc = scenes.map(s=> [
      `SCENE ${s.id} — ${s.heading}`,
      s.description && `Deskripsi: ${s.description}`,
      s.dialogs.length? 'Dialog:' : undefined,
      ...s.dialogs.map(d=> `  • ${characters.find(c=>c.id===d.characterId)?.name||'??'}: "${d.text}"`)
    ].filter(Boolean).join('\n')).join('\n\n')
    return `Judul: ${title}\nGenre: ${genre}\nNada: ${tone}\nAudiens: ${audience}\nTujuan: ${goal}\nBatasan: ${constraints}\n\nKarakter:\n${chars}\n\nCerita:\n${sc}`
  }, [title, genre, tone, audience, goal, constraints, characters, scenes])

  const storyEN = useMemo(()=>{
    const chars = characters.map(c=> `- ${c.name} (${c.role}): ${c.traits}`).join('\n')
    const sc = scenes.map(s=> [
      `SCENE ${s.id} — ${s.heading}`,
      s.description && `Description: ${s.description}`,
      s.dialogs.length? 'Dialog:' : undefined,
      ...s.dialogs.map(d=> `  • ${characters.find(c=>c.id===d.characterId)?.name||'??'}: "${d.text}"`)
    ].filter(Boolean).join('\n')).join('\n\n')
    return `Title: ${title}\nGenre: ${genre}\nTone: ${tone}\nAudience: ${audience}\nGoal: ${goal}\nConstraints: ${constraints}\n\nCharacters:\n${chars}\n\nStory:\n${sc}`
  }, [title, genre, tone, audience, goal, constraints, characters, scenes])

  const storyJSON = useMemo(()=>{
    return {
      title, genre, tone, audience, goal, constraints,
      characters: characters.map(c=> ({ id:c.id, name:c.name, role:c.role, traits:c.traits })),
      scenes: scenes.map(s=> ({ id:s.id, heading:s.heading, description:s.description, dialogs: s.dialogs.map(d=> ({ id:d.id, characterId:d.characterId, text:d.text })) })),
      generateContent: {
        contents: [{ role:'user', parts:[{ text: storyEN }] }]
      }
    }
  }, [title, genre, tone, audience, goal, constraints, characters, scenes, storyEN])

  const copy = (t:string) => navigator.clipboard.writeText(t)
  const download = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
  const safe = (s:string) => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'story'
  const [copiedID, setCopiedID] = useState(false)
  const [copiedEN, setCopiedEN] = useState(false)
  const [copiedJSON, setCopiedJSON] = useState(false)
  const copyWithFeedback = async (text: string, which: 'id'|'en'|'json') => {
    try {
      await navigator.clipboard.writeText(text)
      if (which==='id') { setCopiedID(true); setTimeout(()=>setCopiedID(false), 1500) }
      if (which==='en') { setCopiedEN(true); setTimeout(()=>setCopiedEN(false), 1500) }
      if (which==='json') { setCopiedJSON(true); setTimeout(()=>setCopiedJSON(false), 1500) }
      toast('Copied to clipboard', 'success')
    } catch (e) { toast('Copy failed', 'error') }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div className="card grid md:grid-cols-2 gap-2">
          <input className="input md:col-span-2" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
          <div className="grid grid-cols-1 gap-2">
            <select className="input" value={genre} onChange={e=>setGenre(e.target.value)}>
              {GENRES.map(g=> <option key={g} value={g}>{g}</option>)}
              <option value={genre}>Custom: {genre}</option>
            </select>
            <input className="input" placeholder="Custom genre (optional)" value={genre} onChange={e=>setGenre(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <select className="input" value={tone} onChange={e=>setTone(e.target.value)}>
              {TONES.map(t=> <option key={t} value={t}>{t}</option>)}
              <option value={tone}>Custom: {tone}</option>
            </select>
            <input className="input" placeholder="Custom tone (optional)" value={tone} onChange={e=>setTone(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <select className="input" value={audience} onChange={e=>setAudience(e.target.value)}>
              {AUDIENCES.map(a=> <option key={a} value={a}>{a}</option>)}
              <option value={audience}>Custom: {audience}</option>
            </select>
            <input className="input" placeholder="Custom audience (optional)" value={audience} onChange={e=>setAudience(e.target.value)} />
          </div>
          <input className="input md:col-span-2" placeholder="Goal" value={goal} onChange={e=>setGoal(e.target.value)} />
          <input className="input md:col-span-2" placeholder="Constraints (no brands, safety, etc.)" value={constraints} onChange={e=>setConstraints(e.target.value)} />
        </div>

        <div className="card space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Characters</h3>
            <button className="btn" onClick={addCharacter}>Add</button>
          </div>
          {characters.map(c=> (
            <div key={c.id} className="border border-[var(--border)] rounded-xl p-3 grid md:grid-cols-3 gap-2">
              <input className="input" placeholder="Name" value={c.name} onChange={e=>setCharacters(cs=>cs.map(x=>x.id===c.id?{...x,name:e.target.value}:x))} />
              <input className="input" placeholder="Role" value={c.role} onChange={e=>setCharacters(cs=>cs.map(x=>x.id===c.id?{...x,role:e.target.value}:x))} />
              <input className="input" placeholder="Traits" value={c.traits} onChange={e=>setCharacters(cs=>cs.map(x=>x.id===c.id?{...x,traits:e.target.value}:x))} />
              <button className="btn bg-red-600 hover:bg-red-700 md:col-span-3" onClick={()=>removeCharacter(c.id)}>Remove</button>
            </div>
          ))}
        </div>

        <div className="card space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Scenes</h3>
            <button className="btn" onClick={addScene}>Add Scene</button>
          </div>
          {scenes.map(s=> (
            <div key={s.id} className="border border-[var(--border)] rounded-xl p-3 space-y-2">
              <div className="grid md:grid-cols-2 gap-2">
                <input className="input" placeholder="Heading" value={s.heading} onChange={e=> setScenes(ss=> ss.map(x=> x.id===s.id? {...x, heading:e.target.value}: x))} />
                <input className="input" placeholder="Description" value={s.description} onChange={e=> setScenes(ss=> ss.map(x=> x.id===s.id? {...x, description:e.target.value}: x))} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="label">Dialogs</span>
                  <button className="btn" onClick={()=>addDialog(s.id)}>Add Dialog</button>
                </div>
                {s.dialogs.map(d=> (
                  <div key={d.id} className="grid md:grid-cols-3 gap-2 items-center">
                    <select className="input" value={d.characterId} onChange={e=> setScenes(ss=> ss.map(x=> x.id===s.id? {...x, dialogs: x.dialogs.map(y=> y.id===d.id? {...y, characterId:Number(e.target.value)}: y)}: x))}>
                      {characters.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input className="input md:col-span-2" placeholder="Line" value={d.text} onChange={e=> setScenes(ss=> ss.map(x=> x.id===s.id? {...x, dialogs: x.dialogs.map(y=> y.id===d.id? {...y, text:e.target.value}: y)}: x))} />
                    <button className="btn bg-red-600 hover:bg-red-700 md:col-span-3" onClick={()=>removeDialog(s.id, d.id)}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="card">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Story (Indonesian)</h3>
            <button className="btn" onClick={()=>copyWithFeedback(storyID,'id')}>{copiedID? 'Copied!' : 'Copy'}</button>
          </div>
          <pre className="whitespace-pre-wrap text-sm mt-2">{storyID}</pre>
        </div>
        <div className="card">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Story (English)</h3>
            <button className="btn" onClick={()=>copyWithFeedback(storyEN,'en')}>{copiedEN? 'Copied!' : 'Copy'}</button>
          </div>
          <pre className="whitespace-pre-wrap text-sm mt-2">{storyEN}</pre>
        </div>
        <div className="card">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">JSON (for Gemini generateContent)</h3>
            <div className="flex gap-2">
              <button className="btn" onClick={()=>copyWithFeedback(JSON.stringify(storyJSON, null, 2),'json')}>{copiedJSON? 'Copied!' : 'Copy'}</button>
              <button className="btn" onClick={()=>{ download(`${safe(title)}.json`, JSON.stringify(storyJSON, null, 2)); toast('Downloaded .json', 'success') }}>Download .json</button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap text-sm mt-2">{JSON.stringify(storyJSON, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}
