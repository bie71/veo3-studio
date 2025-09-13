import React, { useEffect, useState } from 'react'

type ToastType = 'info' | 'success' | 'error'
interface ToastItem { id: number; message: string; type: ToastType }

let listeners: ((t: ToastItem) => void)[] = []
let counter = 1

export function toast(message: string, type: ToastType = 'info') {
  const item: ToastItem = { id: counter++, message, type }
  listeners.forEach(l => l(item))
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])
  useEffect(() => {
    const onToast = (t: ToastItem) => {
      setItems(prev => [...prev, t])
      setTimeout(() => {
        setItems(prev => prev.filter(x => x.id !== t.id))
      }, 2000)
    }
    listeners.push(onToast)
    return () => { listeners = listeners.filter(x => x !== onToast) }
  }, [])

  const bg = (type: ToastType) => type === 'success' ? 'bg-emerald-500/90' : type === 'error' ? 'bg-rose-500/90' : 'bg-indigo-500/90'
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {items.map(i => (
        <div key={i.id} className={`text-white px-3 py-2 rounded shadow ${bg(i.type)} backdrop-blur`}>{i.message}</div>
      ))}
    </div>
  )
}

