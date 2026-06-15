function getHeaders(json = true) {
  const token = localStorage.getItem('pm_token')
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function handle(res) {
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({ detail: 'Request failed' }))
  if (!res.ok) throw new Error(data.detail || JSON.stringify(data))
  return data
}

export const authApi = {
  register: (body) => fetch('/auth/register', { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }).then(handle),
  login: (body) => fetch('/auth/login', { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }).then(handle),
  logout: () => fetch('/auth/logout', { method: 'POST', headers: getHeaders() }).then(handle).catch(() => null),
}

export const queryApi = {
  ask: (body) => fetch('/query', { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }).then(handle),
}

export const documentsApi = {
  list: () => fetch('/documents', { headers: getHeaders() }).then(handle),
  upload: (file) => {
    const form = new FormData()
    form.append('file', file)
    return fetch('/documents', { method: 'POST', headers: getHeaders(false), body: form }).then(handle)
  },
  delete: (id) => fetch(`/documents/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handle),
}

export const ingestApi = {
  start: (topic, maxResults) =>
    fetch(`/ingest?topic=${encodeURIComponent(topic)}&max_results=${maxResults}`, {
      method: 'POST', headers: getHeaders(),
    }).then(handle),
  status: (jobId) => fetch(`/ingest/status/${jobId}`, { headers: getHeaders() }).then(handle),
}

export const graphApi = {
  overview: () => fetch('/graph/overview', { headers: getHeaders() }).then(handle),
  explore: (entity) => fetch(`/graph/explore?entity=${encodeURIComponent(entity)}`, { headers: getHeaders() }).then(handle),
}
