export const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api/veo3'

function withKey(init?: RequestInit): RequestInit {
  const key = localStorage.getItem('gemini_key') || ''
  const headers = new Headers(init?.headers || {})
  if (key) headers.set('x-gemini-key', key)
  return { ...init, headers }
}

export function apiFetch(path: string, init?: RequestInit) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  return fetch(url, withKey(init))
}

