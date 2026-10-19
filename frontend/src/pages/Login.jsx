import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, session } from '../api'

export default function Login() {
  const nav = useNavigate()
  const [u, setU] = useState('doctor')
  const [p, setP] = useState('doctor123')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try { session.set(await api.login(u, p)); nav('/') }
    catch (ex) { setErr(ex.message) } finally { setBusy(false) }
  }

  return (
    <div className="login">
      <form className="card" onSubmit={submit}>
        <h1>🩺 CaseWise</h1>
        <p className="muted">Smart patient case-taking with instant triage alerts.</p>
        {err && <div className="err">{err}</div>}
        <div className="field"><label>Username</label><input value={u} onChange={e => setU(e.target.value)} autoFocus /></div>
        <div className="field"><label>Password</label><input type="password" value={p} onChange={e => setP(e.target.value)} /></div>
        <button disabled={busy} style={{ width: '100%' }}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="muted" style={{ marginTop: 16 }}>Demo logins: doctor / doctor123 · nurse / nurse123 · admin / admin123</p>
      </form>
    </div>
  )
}
