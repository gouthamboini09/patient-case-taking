import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { Badge } from '../components'

export default function PatientDetail() {
  const { id } = useParams()
  const [p, setP] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => { api.patient(id).then(setP).catch(e => setErr(e.message)) }, [id])
  if (err) return <div className="err">{err}</div>
  if (!p) return <p className="muted">Loading…</p>

  // Allergies / conditions accumulated across all visits
  const uniq = key => [...new Set(p.cases.flatMap(c => c[key] || []))]

  return (
    <>
      <div className="head">
        <div><h1>{p.name}</h1><span className="muted">{p.mrn} · {p.age} yrs · {p.gender}</span></div>
        <Link className="btn" to={`/cases/new?patient=${p.id}`}>+ New case</Link>
      </div>
      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h2>Demographics</h2>
          <dl className="kv">
            <dt>Phone</dt><dd>{p.phone || '—'}</dd><dt>Blood group</dt><dd>{p.blood_group || '—'}</dd>
            <dt>Address</dt><dd>{p.address || '—'}</dd><dt>Emergency</dt><dd>{p.emergency_contact || '—'}</dd>
          </dl>
        </div>
        <div className="card">
          <h2>Known across visits</h2>
          <dl className="kv">
            <dt>Allergies</dt><dd>{uniq('allergies').join(', ') || 'None recorded'}</dd>
            <dt>Conditions</dt><dd>{uniq('past_history').join(', ') || 'None recorded'}</dd>
            <dt>Medications</dt><dd>{uniq('medications').join(', ') || 'None recorded'}</dd>
          </dl>
        </div>
      </div>
      <div className="card">
        <h2>Visit timeline</h2>
        <table>
          <thead><tr><th>Case</th><th>Date</th><th>Complaint</th><th>Diagnosis</th><th>Triage</th></tr></thead>
          <tbody>
            {p.cases.map(c => (
              <tr key={c.id}>
                <td><Link to={`/cases/${c.id}`}>#{c.id}</Link></td>
                <td>{new Date(c.created_at + 'Z').toLocaleDateString()}</td>
                <td>{c.chief_complaint}</td><td>{c.diagnosis || '—'}</td><td><Badge level={c.triage_level} /></td>
              </tr>
            ))}
            {p.cases.length === 0 && <tr><td colSpan="5" className="muted">No visits yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
