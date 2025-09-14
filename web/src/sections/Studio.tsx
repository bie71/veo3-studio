import React, { useMemo, useRef, useState } from 'react'
import { toast } from '../lib/toast'

type Aspect = '16:9' | '9:16'
type Resolution = '720p' | '1080p'
type StylePreset = 'realistic' | 'anime' | 'cartoon' | '3d'

interface RefImage { mimeType: string; dataBase64: string }

export function Studio() {
  const [mode, setMode] = useState<'single'|'segmented'>('single')
  const [prompt, setPrompt] = useState('Close-up of a sunrise over Jakarta skyline with morning haze, people commuting, gentle warm light.')
  const [aspectRatio, setAspectRatio] = useState<Aspect>('16:9')
  const [resolution, setResolution] = useState<Resolution>('1080p')
  const [removeAudio, setRemoveAudio] = useState(false)
  const [durationSeconds, setDurationSeconds] = useState(5)
  const [model, setModel] = useState('veo-3.0-fast-generate-001')
  const [stylePreset, setStylePreset] = useState<StylePreset>('realistic')
  const [styleStrength, setStyleStrength] = useState(50)
  const [negativePrompt, setNegativePrompt] = useState('logos, brands, watermark, text')
  const [images, setImages] = useState<RefImage[]>([])
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  // Segments
  const [segments, setSegments] = useState<{id:number; prompt:string; durationSeconds:number; usePrevLastFrame:boolean; referenceImages:RefImage[]}[]>([
    { id:1, prompt: prompt, durationSeconds: 5, usePrevLastFrame: false, referenceImages: [] }
  ])
  const [jobId, setJobId] = useState<string | null>(null)
  const [segmentResults, setSegmentResults] = useState<any[]>([])

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

  const doGenerateSingle = async () => {
    setBusy(true)
    setStatus('Generating video...')
    setVideoUrl(null)
    try {
      const resp = await apiFetch(`/generate?model=${encodeURIComponent(model)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          resolution,
          removeAudio,
          durationSeconds,
          stylePreset,
          styleStrength,
          negativePrompt,
          referenceImages: images
        })
      })
      const ct = resp.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        const j = await resp.json()
        const url = j.videoUrl || j.url || j.resultUrl
        if (url) {
          setVideoUrl(url)
          setStatus('Video generated')
          toast('Video generated', 'success')
        } else {
          alert('No video URL in JSON response')
        }
      } else {
        // Stream binary to blob
        const blob = await resp.blob()
        const url = URL.createObjectURL(blob)
        setVideoUrl(url)
        setStatus('Video generated')
        toast('Video generated', 'success')
      }
    } catch (e:any) {
      alert(e?.message || 'Generate failed')
      toast('Generate failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const up = (i:number) => {
    if (i===0) return
    const copy = [...segments]
    ;[copy[i-1], copy[i]] = [copy[i], copy[i-1]]
    setSegments(copy)
  }
  const down = (i:number) => {
    if (i===segments.length-1) return
    const copy = [...segments]
    ;[copy[i+1], copy[i]] = [copy[i], copy[i+1]]
    setSegments(copy)
  }

  const renderSegments = async () => {
    setBusy(true); setStatus('Rendering segments...')
    setJobId(null)
    setSegmentResults([])
    try {
      const body = {
        model,
        global: { aspectRatio, resolution, removeAudio, videoCodec: 'H264', fps: 30, stylePreset, styleStrength, negativePrompt },
        segments: segments.map(s => ({ id: s.id, prompt: s.prompt, durationSeconds: s.durationSeconds, usePrevLastFrame: s.usePrevLastFrame, referenceImages: s.referenceImages }))
      }
      const resp = await apiFetch('/segments', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      const j = await resp.json()
      setSegmentResults(j.results || [])
      setStatus('Segments rendered')
      toast('Segments rendered', 'success')
      setJobId(j.jobId || (j.results?.length ? 'job_'+Date.now() : null))
    } catch (e:any) {
      alert(e?.message || 'Segments failed')
      toast('Segments failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const concatFinal = async () => {
    if (!segmentResults.length) return
    const job = jobId || 'job_custom'
    const segs = segmentResults.filter(r=>r.ok && r.videoUrl).map(r=>r.videoUrl as string)
    // server expects filesystem paths under /jobs; use as-is if returned as /jobs/<job>/seg_X.mp4
    try {
      setStatus('Concatenating final video...')
      const fps = 30
      const body = { jobId: job, aspectRatio, resolution, fps, segments: segs.map(u => u.replace(/^\/jobs\//, 'jobs/')) }
      const resp = await apiFetch('/concat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      const j = await resp.json()
      if (j.ok && j.url) {
        setVideoUrl(j.url)
        setStatus('Final video ready')
        toast('Final video ready', 'success')
      } else {
        alert(j.message || 'Concat failed')
        toast('Concat failed', 'error')
      }
    } catch (e:any) {
      alert(e?.message || 'Concat failed')
      toast('Concat failed', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4 lg:space-y-0 lg:flex lg:items-start lg:gap-6">
        <div className="flex-1 min-w-0 space-y-4">
          <div className="card space-y-3">
            <div className="flex gap-2 items-center">
              <span className="label">Mode</span>
              <select className="input max-w-[200px]" value={mode} onChange={e=>setMode(e.target.value as any)}>
                <option value="single">Single</option>
                <option value="segmented">Segmented</option>
              </select>
            </div>
            {mode==='single' && (
              <>
                <label className="label">Prompt</label>
                <textarea className="input h-28" value={prompt} onChange={e=>setPrompt(e.target.value)} />
              </>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              <div>
                <label className="label">Duration (s)</label>
                <input className="input" type="number" min={3} max={60} value={durationSeconds} onChange={e=>setDurationSeconds(Number(e.target.value))} />
              </div>
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
              <div className="flex items-center gap-2">
                <input id="aud" type="checkbox" checked={removeAudio} onChange={e=>setRemoveAudio(e.target.checked)} />
                <label htmlFor="aud" className="label">Remove Audio</label>
              </div>
              <div>
                <label className="label">Negative Prompt</label>
                <input className="input" value={negativePrompt} onChange={e=>setNegativePrompt(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="label">Reference Images (multi)</label>
              <input type="file" accept="image/*" multiple onChange={e=>handleFiles(e.target.files, setImages)} />
              <div className="flex gap-2 flex-wrap">
                {images.map((img, i)=> (
                  <img key={i} src={`data:${img.mimeType};base64,${img.dataBase64}`} alt="ref" className="w-20 h-20 object-cover rounded"/>
                ))}
              </div>
            </div>

            {mode==='single' ? (
              <button className="btn" disabled={busy} onClick={doGenerateSingle}>{busy? 'Generating...' : 'Generate'}</button>
            ) : null}
          </div>

          {mode==='segmented' && (
            <div className="card space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Segments</h3>
                <button className="btn" onClick={()=>setSegments(s=>[...s, { id: (s.at(-1)?.id||0)+1, prompt: '', durationSeconds:5, usePrevLastFrame:true, referenceImages: [] }])}>Add Segment</button>
              </div>
              <div className="space-y-4">
                {segments.map((s, i)=> (
                  <div key={s.id} className="border border-[var(--border)] rounded p-3 space-y-2">
                    <div className="flex gap-2">
                      <button className="btn" onClick={()=>up(i)}>Up</button>
                      <button className="btn" onClick={()=>down(i)}>Down</button>
                      <button className="btn bg-red-600 hover:bg-red-700" onClick={()=>setSegments(prev=>prev.filter(x=>x.id!==s.id))}>Remove</button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <label className="label">ID</label>
                        <input className="input" value={s.id} onChange={e=>{
                          const v = Number(e.target.value); setSegments(prev=>prev.map(x=>x.id===s.id?{...x,id:v}:x))
                        }} />
                      </div>
                      <div>
                        <label className="label">Duration (s)</label>
                        <input className="input" type="number" min={3} max={60} value={s.durationSeconds} onChange={e=>setSegments(prev=>prev.map(x=>x.id===s.id?{...x,durationSeconds:Number(e.target.value)}:x))} />
                      </div>
                      <div className="flex items-center gap-2 mt-6">
                        <input type="checkbox" checked={s.usePrevLastFrame} onChange={e=>setSegments(prev=>prev.map(x=>x.id===s.id?{...x,usePrevLastFrame:e.target.checked}:x))} />
                        <span className="label">Use previous last frame</span>
                      </div>
                    </div>
                    <div>
                      <label className="label">Prompt</label>
                      <textarea className="input h-24" value={s.prompt} onChange={e=>setSegments(prev=>prev.map(x=>x.id===s.id?{...x,prompt:e.target.value}:x))} />
                    </div>
                    <div>
                      <label className="label">Reference Images</label>
                      <input type="file" accept="image/*" multiple onChange={e=>handleFiles(e.target.files, imgs=> setSegments(prev=>prev.map(x=>x.id===s.id?{...x,referenceImages:imgs}:x)))} />
                      <div className="flex gap-2 flex-wrap">
                        {s.referenceImages.map((img, k)=> (
                          <img key={k} src={`data:${img.mimeType};base64,${img.dataBase64}`} className="w-16 h-16 object-cover rounded"/>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="btn" disabled={busy} onClick={renderSegments}>{busy? 'Rendering...' : 'Render Segments'}</button>
                <button className="btn" disabled={!segmentResults.length || busy} onClick={concatFinal}>Concat Final</button>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky top-20 lg:w-[640px]">
          {status && (
            <div className="card"><span className="text-sm text-muted">{busy && <span className="inline-block mr-2 align-middle"><span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span></span>}{status}</span></div>
          )}

          {!!segmentResults.length && (
            <div className="card space-y-2">
              <h4 className="font-semibold">Segments Preview</h4>
              <div className="grid grid-cols-1 gap-3">
                {segmentResults.filter((r:any)=>r.ok && r.videoUrl).map((r:any)=> (
                  <div key={r.id} className="rounded overflow-hidden bg-black">
                    <video src={r.videoUrl} controls className="w-full aspect-video object-contain bg-black" />
                    <div className="p-2 text-sm flex justify-between items-center">
                      <span>Seg {r.id}</span>
                      <a className="btn" href={r.videoUrl} download>Download</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {videoUrl && (
            <div className="card space-y-2">
              <h3 className="font-semibold">Output</h3>
              <video src={videoUrl} controls className="w-full aspect-video object-contain bg-black" />
              <a className="btn inline-block w-full text-center" href={videoUrl} download>Download Final</a>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
import { API_BASE, apiFetch } from '../lib/api'
