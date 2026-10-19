// In production set VITE_API_URL to the backend address (no trailing slash); locally the Vite proxy is used.
const BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api`
const TOKEN_KEY = 'pct_token'
const USER_KEY = 'pct_user'

export const session = {
  get token() { return localStorage.getItem(TOKEN_KEY) },
  get user() { try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null } },
  set(data) {
    localStorage.setItem(TOKEN_KEY, data.access_token)
    localStorage.setItem(USER_KEY, JSON.stringify({ name: data.full_name, role: data.role }))
  },
  clear() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY) },
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof URLSearchParams) ? { 'Content-Type': 'application/json' } : {}),
      ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
    },
  })
  if (res.status === 401 && session.token) {
    session.clear()
    window.location.href = '/login'
    return
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const j = await res.json()
      detail = typeof j.detail === 'string' ? j.detail : j.detail?.map(d => `${d.loc?.slice(-1)}: ${d.msg}`).join('; ')
    } catch { /* ignore */ }
    throw new Error(detail)
  }
  return res.status === 204 ? null : res.json()
}

export const api = {
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: new URLSearchParams({ username, password }) }),
  summary: () => request('/analytics/summary'),
  patients: (q = '') => request(`/patients?q=${encodeURIComponent(q)}`),
  patient: id => request(`/patients/${id}`),
  createPatient: body => request('/patients', { method: 'POST', body: JSON.stringify(body) }),
  cases: (params = '') => request(`/cases${params}`),
  case: id => request(`/cases/${id}`),
  createCase: body => request('/cases', { method: 'POST', body: JSON.stringify(body) }),
  updateCase: (id, body) => request(`/cases/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  audit: () => request('/audit'),
  async openPdf(id) {
    const res = await fetch(`${BASE}/cases/${id}/pdf`, { headers: { Authorization: `Bearer ${session.token}` } })
    const blob = await res.blob()
    window.open(URL.createObjectURL(blob), '_blank')
  },
}
