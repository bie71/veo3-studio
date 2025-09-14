import React, { useMemo, useState } from 'react'

type Aspect = '16:9' | '9:16'
type Resolution = '720p' | '1080p'
type StylePreset = 'realistic' | 'anime' | 'cartoon' | '3d'

interface RefImage { mimeType: string; dataBase64: string }

const LOCATIONS = [
  'Modern office', 'Jakarta street market', 'Cafe interior', 'Minimal studio', 'Apartment living room', 'Mountain viewpoint', 'Beach at sunset'
]
const LIGHTING = [
  'Soft daylight ~5200K', 'Golden hour warm', 'Overcast diffuse', 'Neon mixed light', 'Cool tungsten', 'High key', 'Low key moody'
]
const CAMERA = [
  '35mm eye-level', '85mm portrait', 'Wide 24mm', 'Top-down', 'Dutch angle', 'Macro close-up'
]
const MOVES = [
  'Static with 0.3s hold then 2% push-in', 'Slow micro-pan left', 'Slow micro-pan right', 'Dolly-in subtle', 'Tilt up gentle'
]
const SUBJECTS = ['Person', 'Product', 'Food', 'Landscape', 'Pet']
const ACTIONS = ['Speaking to camera', 'Unboxing', 'Typing on laptop', 'Walking by', 'Pouring coffee']

export function StoryboardBuilder() {
  const [aspectRatio, setAspectRatio] = useState<Aspect>('16:9')
  const [resolution, setResolution] = useState<Resolution>('1080p')
  const [removeAudio, setRemoveAudio] = useState(false)
  const [stylePreset, setStylePreset] = useState<StylePreset>('realistic')
  const [styleStrength, setStyleStrength] = useState(50)
  const [negativePrompt, setNegativePrompt] = useState('logos, brands, watermark, text')
  const [fps, setFps] = useState(30)
  const [model, setModel] = useState('veo-3.0-fast-generate-001')

  const [location, setLocation] = useState(LOCATIONS[0])
  const [lighting, setLighting] = useState(LIGHTING[0])
  const [camera, setCamera] = useState(CAMERA[0])
  const [move, setMove] = useState(MOVES[0])
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [action, setAction] = useState(ACTIONS[0])
  const [notes, setNotes] = useState('')

  const [segments, setSegments] = useState<{ id: number; durationSeconds: number; usePrevLastFrame: boolean; referenceImages: RefImage[]; manualPrompt?: string }[]>([
    { id: 1, durationSeconds: 4, usePrevLastFrame: false, referenceImages: [] }
  ])
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [finalUrl, setFinalUrl] = useState<string | null>(null)

  const buildPrompt = (segIdx: number) => {
    const common = `${subject} in ${location}. Lighting: ${lighting}. Lens/Angle: ${camera}. Camera: ${move}. ${notes}`.trim()
    return common
  }

  const handleFiles = async (files: FileList | null, cb: (imgs:RefImage[])=>void) => {
    if (!files) return
    const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => {
        const result = String(fr.result || '')
        const comma = result.indexOf(',')
        resolve(comma >= 0 ? result.slice(comma + 1) : result)
      }
      fr.onerror = () => reject(fr.error)
      fr.readAsDataURL(file)
    })
    const arr: RefImage[] = []
    for (const f of Array.from(files)) {
      const b64 = await toBase64(f)
      arr.push({ mimeType: f.type || 'image/png', dataBase64: b64 })
    }
    cb(arr)
  }

  const renderSegments = async () => {
    setBusy(true); setResults([]); setFinalUrl(null)
    try {
      const body = {
        model,
        global: { aspectRatio, resolution, removeAudio, videoCodec: 'H264', fps, stylePreset, styleStrength, negativePrompt },
        segments: segments.map((s, idx) => ({
          id: s.id,
          durationSeconds: s.durationSeconds,
          usePrevLastFrame: s.usePrevLastFrame,
          prompt: s.manualPrompt && s.manualPrompt.trim().length ? s.manualPrompt : buildPrompt(idx),
          referenceImages: s.referenceImages
        }))
      }
      const resp = await apiFetch('/segments', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      const j = await resp.json()
      setResults(j.results || [])
    } catch (e:any) {
      alert(e?.message || 'Segments failed')
    } finally {
      setBusy(false)
    }
  }

  const concatFinal = async () => {
    const okSegs = results.filter(r=>r.ok && r.videoUrl).map((r:any)=> r.videoUrl as string)
    if (!okSegs.length) return
    try {
      const body = { jobId: 'storyboard-'+Date.now(), aspectRatio, resolution, fps, segments: okSegs.map((u:string)=> u.replace(/^\/jobs\//, 'jobs/')) }
      const resp = await apiFetch('/concat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      const j = await resp.json()
      if (j.ok && j.url) setFinalUrl(j.url)
      else alert(j.message || 'Concat failed')
    } catch (e:any) {
      alert(e?.message || 'Concat failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="card grid md:grid-cols-3 gap-3">
        <div>
          <label className="label">Model</label>
          <select className="input" value={model} onChange={e=>setModel(e.target.value)}>
            <option value="veo-3.0-fast-generate-001">veo-3.0-fast-generate-001</option>
            <option value="veo-3.0-generate-001">veo-3.0-generate-001</option>
            <option value="veo-2.0-generate-001">veo-2.0-generate-001</option>
            <option value="veo-3.0">veo-3.0 (legacy)</option>
            <option value="veo-3-fast">veo-3-fast (legacy)</option>
          </select>
        </div>
        <div>
          <label className="label">Aspect</label>
          <select className="input" value={aspectRatio} onChange={e=>setAspectRatio(e.target.value as Aspect)}>
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
        <div className="flex items-center gap-2 mt-6">
          <input id="sb-audio" type="checkbox" checked={removeAudio} onChange={e=>setRemoveAudio(e.target.checked)} />
          <label className="label" htmlFor="sb-audio">Remove Audio</label>
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
        <div>
          <label className="label">Negative Prompt</label>
          <input className="input" value={negativePrompt} onChange={e=>setNegativePrompt(e.target.value)} />
        </div>
      </div>

      <div className="card grid md:grid-cols-3 gap-3">
        <div>
          <label className="label">Location</label>
          <select className="input" value={location} onChange={e=>setLocation(e.target.value)}>
            {LOCATIONS.map((x)=> <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Lighting</label>
          <select className="input" value={lighting} onChange={e=>setLighting(e.target.value)}>
            {LIGHTING.map((x)=> <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Lens & Angle</label>
          <select className="input" value={camera} onChange={e=>setCamera(e.target.value)}>
            {CAMERA.map((x)=> <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Camera Move</label>
          <select className="input" value={move} onChange={e=>setMove(e.target.value)}>
            {MOVES.map((x)=> <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Subject</label>
          <select className="input" value={subject} onChange={e=>setSubject(e.target.value)}>
            {SUBJECTS.map((x)=> <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Action</label>
          <select className="input" value={action} onChange={e=>setAction(e.target.value)}>
            {ACTIONS.map((x)=> <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="label">Extra Notes (optional)</label>
          <input className="input" placeholder="e.g., mood, attire, colors, safety notes" value={notes} onChange={e=>setNotes(e.target.value)} />
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Segments</h3>
          <button className="btn" onClick={()=>setSegments(s=>[...s, { id:(s.at(-1)?.id||0)+1, durationSeconds:4, usePrevLastFrame:true, referenceImages: [] }])}>Add Segment</button>
        </div>
        <div className="space-y-4">
          {segments.map(s => (
            <div key={s.id} className="border border-[var(--border)] rounded-xl p-3 space-y-2">
              <div className="grid md:grid-cols-4 gap-3">
                <div>
                  <label className="label">ID</label>
                  <input className="input" value={s.id} onChange={e=> setSegments(prev=> prev.map(x=> x.id===s.id? {...x, id:Number(e.target.value)} : x))} />
                </div>
                <div>
                  <label className="label">Duration (s)</label>
                  <input className="input" type="number" min={3} max={60} value={s.durationSeconds} onChange={e=> setSegments(prev=> prev.map(x=> x.id===s.id? {...x, durationSeconds:Number(e.target.value)} : x))} />
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input type="checkbox" checked={s.usePrevLastFrame} onChange={e=> setSegments(prev=> prev.map(x=> x.id===s.id? {...x, usePrevLastFrame:e.target.checked} : x))} />
                  <span className="label">Use prev last frame</span>
                </div>
                <div className="md:col-span-1">
                  <label className="label">Manual Prompt (optional)</label>
                  <input className="input" placeholder="Override auto prompt for this segment" value={s.manualPrompt || ''} onChange={e=> setSegments(prev=> prev.map(x=> x.id===s.id? {...x, manualPrompt:e.target.value} : x))} />
                </div>
              </div>
              <div>
                <label className="label">Reference Images</label>
                <input type="file" accept="image/*" multiple onChange={e=> handleFiles(e.target.files, imgs=> setSegments(prev=> prev.map(x=> x.id===s.id? {...x, referenceImages: imgs} : x)))} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="btn" disabled={busy} onClick={renderSegments}>{busy? 'Rendering...' : 'Render Segments'}</button>
          <button className="btn" disabled={!results.length || busy} onClick={concatFinal}>Concat Final</button>
        </div>
        {!!results.length && (
          <ul className="list-disc pl-5">
            {results.map((r:any)=> <li key={r.id} className={r.ok? '' : 'text-red-500'}>seg {r.id}: {r.ok? r.videoUrl : r.message}</li>)}
          </ul>
        )}
        {finalUrl && (
          <div className="space-y-2">
            <h4 className="font-semibold">Final</h4>
            <video src={finalUrl} controls className="w-full max-w-2xl bg-black" />
            <a className="btn inline-block w-max" href={finalUrl} download>Download</a>
          </div>
        )}
      </div>
    </div>
  )
}
import { apiFetch } from '../lib/api'
