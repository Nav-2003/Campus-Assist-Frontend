const listeners = new Set()

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
  listeners.forEach((fn) => fn(key))
  window.dispatchEvent(
    new CustomEvent('ca-storage', { detail: { key } }),
  )
}

export function subscribeStorage(callback) {
  listeners.add(callback)

  function onStorage(e) {
    if (e.key) callback(e.key)
  }

  function onCustom(e) {
    if (e.detail?.key) callback(e.detail.key)
  }

  window.addEventListener('storage', onStorage)
  window.addEventListener('ca-storage', onCustom)

  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('ca-storage', onCustom)
  }
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}
