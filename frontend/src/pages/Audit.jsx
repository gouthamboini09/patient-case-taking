import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Audit() {
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  useEffect(() => { api.audit().then(setRows).catch(e => setErr(e.message)) }, [])
  return (
    <>
      <div className="head"><div><h1>Audit log</h1><span className="muted">Who accessed or changed what (last 100 events)</span></div></div>
      {err && <div className="err">{err}</div>}
      <div className="card">
        <table>
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Record</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}><td className="muted">{new Date(r.at + 'Z').toLocaleString()}</td><td>{r.user}</td>
                <td><span className="badge open">{r.action}</span></td><td>{r.entity} #{r.entity_id}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
