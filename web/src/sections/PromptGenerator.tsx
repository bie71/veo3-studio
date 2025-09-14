import React, { useEffect, useMemo, useState } from 'react'
import { toast } from '../lib/toast'

type Aspect = '16:9' | '9:16'
type Resolution = '720p' | '1080p'
type StylePreset = 'realistic' | 'anime' | 'cartoon' | '3d'

interface Character { id:number; name:string; ethnicity:string; gender:string; age:string; outfit:string; hair:string; voice:string; description:string; action:string }
interface Dialog { id:number; characterId:number; text:string }

export function PromptGenerator() {
  const [characters, setCharacters] = useState<Character[]>([
    { id:1, name:'Rina', ethnicity:'Indonesian', gender:'F', age:'25', outfit:'casual', hair:'short', voice:'id-ID-Standard-A', description:'optimistic content creator', action:'speaks to camera' }
  ])
  const [dialogs, setDialogs] = useState<Dialog[]>([
    { id:1, characterId:1, text:'Halo semuanya, selamat pagi!' }
  ])
  const [environment, setEnvironment] = useState('Jakarta apartment, morning window light, cozy desk')
  const [lighting, setLighting] = useState('soft daylight ~5200K')
  const [angles, setAngles] = useState('35mm, eye-level, gentle push-in')
  const [styles, setStyles] = useState('clean, modern, natural skin tones')
  const [aspect, setAspect] = useState<Aspect>('16:9')
  const [resolution, setResolution] = useState<Resolution>('1080p')
  const [removeAudio, setRemoveAudio] = useState(false)
  const [duration, setDuration] = useState(8)
  const [stylePreset, setStylePreset] = useState<StylePreset>('realistic')
  const [styleStrength, setStyleStrength] = useState(50)
  const [negativePrompt, setNegativePrompt] = useState('logos, brands, watermark, text')

  const idPrompt = useMemo(()=>{
    const ch = characters.map(c=> `- ${c.name}: ${c.ethnicity}, ${c.gender}, ${c.age}, outfit ${c.outfit}, rambut ${c.hair}. Karakter: ${c.description}. Aksi: ${c.action}.`).join('\n')
    const dia = dialogs.map(d=> `- ${characters.find(c=>c.id===d.characterId)?.name||'Unknown'}: "${d.text}"`).join('\n')
    return `Buat video pendek dengan karakter berikut:\n${ch}\n\nLingkungan & Kamera:\n- Lingkungan: ${environment}\n- Pencahayaan: ${lighting}\n- Angle/Gaya: ${angles}; ${styles}\n\nDialog:\n${dia}\n\nAspek: ${aspect}, Resolusi: ${resolution}, Durasi: ${duration}s. Gaya: ${stylePreset} (kekuatan ${styleStrength}/100). Hindari: ${negativePrompt}. ${removeAudio? 'Tanpa audio.' : 'Gunakan VO bahasa Indonesia, natural.'}`
  }, [characters, dialogs, environment, lighting, angles, styles, aspect, resolution, duration, stylePreset, styleStrength, negativePrompt, removeAudio])

  const enPrompt = useMemo(()=>{
    const ch = characters.map(c=> `- ${c.name}: ${c.ethnicity}, ${c.gender}, ${c.age}, outfit ${c.outfit}, hair ${c.hair}. Character: ${c.description}. Action: ${c.action}.`).join('\n')
    const dia = dialogs.map(d=> `- ${characters.find(c=>c.id===d.characterId)?.name||'Unknown'}: "${d.text}"`).join('\n')
    return `Create a short video with these characters:\n${ch}\n\nEnvironment & Camera:\n- Environment: ${environment}\n- Lighting: ${lighting}\n- Angles/Style: ${angles}; ${styles}\n\nDialog:\n${dia}\n\nAspect: ${aspect}, Resolution: ${resolution}, Duration: ${duration}s. Style: ${stylePreset} (strength ${styleStrength}/100). Avoid: ${negativePrompt}. ${removeAudio? 'Render WITHOUT audio.' : 'Use Indonesian voiceover, natural.'}`
  }, [characters, dialogs, environment, lighting, angles, styles, aspect, resolution, duration, stylePreset, styleStrength, negativePrompt, removeAudio])

  const jsonBody = useMemo(()=>{
    return {
      contents: [{ role:'user', parts:[{ text: enPrompt }] }],
      toolConfig: { aspectRatio: aspect, resolution, removeAudio, durationSeconds: duration, stylePreset, styleStrength, negativePrompt },
    }
  }, [enPrompt, aspect, resolution, removeAudio, duration, stylePreset, styleStrength, negativePrompt])

  const copy = (t:string) => navigator.clipboard.writeText(t)
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
    } catch (e) {
      toast('Copy failed', 'error')
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div className="card space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Characters</h3>
            <button className="btn" onClick={()=> setCharacters(cs=>[...cs, { id: (cs.at(-1)?.id||0)+1, name:'New', ethnicity:'', gender:'', age:'', outfit:'', hair:'', voice:'id-ID-Standard-A', description:'', action:'' }])}>Add</button>
          </div>
          {characters.map(c=> (
            <div key={c.id} className="border border-[var(--border)] rounded p-3 grid md:grid-cols-2 gap-2">
              <div>
                <label htmlFor={`char-${c.id}-name`} className="label">Name</label>
                <input id={`char-${c.id}-name`} className="input" placeholder="e.g., Rina" value={c.name} onChange={e=>setCharacters(cs=>cs.map(x=>x.id===c.id?{...x,name:e.target.value}:x))} />
              </div>
              <div>
                <label htmlFor={`char-${c.id}-eth`} className="label">Ethnicity</label>
                <input id={`char-${c.id}-eth`} className="input" placeholder="e.g., Indonesian" value={c.ethnicity} onChange={e=>setCharacters(cs=>cs.map(x=>x.id===c.id?{...x,ethnicity:e.target.value}:x))} />
              </div>
              <div>
                <label htmlFor={`char-${c.id}-gender`} className="label">Gender</label>
                <input id={`char-${c.id}-gender`} className="input" placeholder="e.g., F/M" value={c.gender} onChange={e=>setCharacters(cs=>cs.map(x=>x.id===c.id?{...x,gender:e.target.value}:x))} />
              </div>
              <div>
                <label htmlFor={`char-${c.id}-age`} className="label">Age</label>
                <input id={`char-${c.id}-age`} className="input" placeholder="e.g., 25" value={c.age} onChange={e=>setCharacters(cs=>cs.map(x=>x.id===c.id?{...x,age:e.target.value}:x))} />
              </div>
              <div>
                <label htmlFor={`char-${c.id}-outfit`} className="label">Outfit</label>
                <input id={`char-${c.id}-outfit`} className="input" placeholder="e.g., casual" value={c.outfit} onChange={e=>setCharacters(cs=>cs.map(x=>x.id===c.id?{...x,outfit:e.target.value}:x))} />
              </div>
              <div>
                <label htmlFor={`char-${c.id}-hair`} className="label">Hair</label>
                <input id={`char-${c.id}-hair`} className="input" placeholder="e.g., short" value={c.hair} onChange={e=>setCharacters(cs=>cs.map(x=>x.id===c.id?{...x,hair:e.target.value}:x))} />
              </div>
              <div>
                <label htmlFor={`char-${c.id}-voice`} className="label">Voice</label>
                <input id={`char-${c.id}-voice`} className="input" placeholder="e.g., id-ID-Standard-A" value={c.voice} onChange={e=>setCharacters(cs=>cs.map(x=>x.id===c.id?{...x,voice:e.target.value}:x))} />
              </div>
              <div>
                <label htmlFor={`char-${c.id}-desc`} className="label">Description</label>
                <input id={`char-${c.id}-desc`} className="input" placeholder="Character backstory/traits" value={c.description} onChange={e=>setCharacters(cs=>cs.map(x=>x.id===c.id?{...x,description:e.target.value}:x))} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor={`char-${c.id}-action`} className="label">Action</label>
                <input id={`char-${c.id}-action`} className="input" placeholder="What are they doing/saying" value={c.action} onChange={e=>setCharacters(cs=>cs.map(x=>x.id===c.id?{...x,action:e.target.value}:x))} />
              </div>
              <button className="btn bg-red-600 hover:bg-red-700 md:col-span-2" onClick={()=>setCharacters(cs=>cs.filter(x=>x.id!==c.id))}>Remove</button>
            </div>
          ))}
        </div>
        <div className="card space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Dialogs</h3>
            <button className="btn" onClick={()=> setDialogs(ds=>[...ds, { id:(ds.at(-1)?.id||0)+1, characterId: characters[0]?.id||1, text:'' }])}>Add</button>
          </div>
          {dialogs.map(d=> (
            <div key={d.id} className="border border-[var(--border)] rounded p-3 grid md:grid-cols-3 gap-2 items-center">
              <div>
                <label htmlFor={`dialog-${d.id}-char`} className="label">Character</label>
                <select id={`dialog-${d.id}-char`} className="input" value={d.characterId} onChange={e=>setDialogs(ds=>ds.map(x=>x.id===d.id?{...x,characterId:Number(e.target.value)}:x))}>
                  {characters.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label htmlFor={`dialog-${d.id}-text`} className="label">Dialog Text</label>
                <input id={`dialog-${d.id}-text`} className="input" placeholder="What they say" value={d.text} onChange={e=>setDialogs(ds=>ds.map(x=>x.id===d.id?{...x,text:e.target.value}:x))} />
              </div>
              <button className="btn bg-red-600 hover:bg-red-700 md:col-span-3" onClick={()=>setDialogs(ds=>ds.filter(x=>x.id!==d.id))}>Remove</button>
            </div>
          ))}
        </div>
        <div className="card grid md:grid-cols-2 gap-2">
          <div>
            <label htmlFor="env" className="label">Environment</label>
            <input id="env" className="input" placeholder="e.g., Jakarta apartment, morning light" value={environment} onChange={e=>setEnvironment(e.target.value)} />
          </div>
          <div>
            <label htmlFor="lighting" className="label">Lighting</label>
            <input id="lighting" className="input" placeholder="e.g., soft daylight ~5200K" value={lighting} onChange={e=>setLighting(e.target.value)} />
          </div>
          <div>
            <label htmlFor="angles" className="label">Angles</label>
            <input id="angles" className="input" placeholder="e.g., 35mm, eye-level, push-in" value={angles} onChange={e=>setAngles(e.target.value)} />
          </div>
          <div>
            <label htmlFor="styles" className="label">Shooting Styles</label>
            <input id="styles" className="input" placeholder="e.g., clean, modern" value={styles} onChange={e=>setStyles(e.target.value)} />
          </div>
          <div>
            <label className="label">Aspect</label>
            <select className="input" value={aspect} onChange={e=>setAspect(e.target.value as Aspect)}>
              <option>16:9</option>
              <option>9:16</option>
            </select>
          </div>
          <div>
            <label className="label">Resolution</label>
            <select className="input" value={resolution} onChange={e=>setResolution(e.target.value as Resolution)}>
              <option>720p</option>
              <option>1080p</option>
            </select>
          </div>
          <div>
            <label className="label">Duration (s)</label>
            <input className="input" type="number" min={3} max={60} value={duration} onChange={e=>setDuration(Number(e.target.value))} />
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input id="remove-audio" type="checkbox" checked={removeAudio} onChange={e=>setRemoveAudio(e.target.checked)} />
            <label htmlFor="remove-audio" className="label">Remove Audio</label>
          </div>
          <div>
            <label className="label">Style Preset</label>
            <select className="input" value={stylePreset} onChange={e=>setStylePreset(e.target.value as StylePreset)}>
              <option>realistic</option>
              <option>anime</option>
              <option>cartoon</option>
              <option>3d</option>
            </select>
          </div>
          <div>
            <label className="label">Style Strength</label>
            <input className="input" type="number" min={0} max={100} value={styleStrength} onChange={e=>setStyleStrength(Number(e.target.value))} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Negative Prompt</label>
            <input className="input" value={negativePrompt} onChange={e=>setNegativePrompt(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="card">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Prompt (Indonesian)</h3>
            <button className="btn" onClick={()=>copyWithFeedback(idPrompt,'id')}>{copiedID? 'Copied!' : 'Copy'}</button>
          </div>
          <pre className="whitespace-pre-wrap text-sm mt-2">{idPrompt}</pre>
        </div>
        <div className="card">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Prompt (English)</h3>
            <button className="btn" onClick={()=>copyWithFeedback(enPrompt,'en')}>{copiedEN? 'Copied!' : 'Copy'}</button>
          </div>
          <pre className="whitespace-pre-wrap text-sm mt-2">{enPrompt}</pre>
        </div>
        <div className="card">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">JSON generateContent</h3>
            <button className="btn" onClick={()=>copyWithFeedback(JSON.stringify(jsonBody, null, 2),'json')}>{copiedJSON? 'Copied!' : 'Copy'}</button>
          </div>
          <pre className="whitespace-pre-wrap text-sm mt-2">{JSON.stringify(jsonBody, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}
