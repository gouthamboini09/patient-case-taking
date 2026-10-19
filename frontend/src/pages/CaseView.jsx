import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, session } from '../api'
import { Badge } from '../components'

function Vital({ label, value, unit, bad }) {
  return <div className={`card vit ${bad ? 'bad' : ''}`}><div className="v">{value ?? '—'}<small>{value != null ? unit : ''}</small></div><div className="l">{label}</div></div>
}
const list = a => (a && a.length ? a.join(', ') : 'None reported')

export default function CaseView() {
  const { id } = useParams()
  const [c, setC] = useState(null)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { api.case(id).then(setC).catch(e => setErr(e.message)) }, [id])
  if (err) return <div className="err">{err}</div>
  if (!c) return <p className="muted">Loading…</p>

  const canEdit = session.user?.role !== 'nurse'
  async function setStatus(status) {
    setSaving(true)
    try {
      const { id: _i, triage_level, red_flags, created_at, updated_at, patient, bmi, ...rest } = c
      setC(await api.updateCase(c.id, { ...rest, status }))
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  const p = c.patient
  return (
    <>
      <div className="head">
        <div><h1>Case #{c.id} · {p?.name}</h1>
          <span className="muted">{new Date(c.created_at + 'Z').toLocaleString()} · <Link to={`/patients/${p?.id}`}>{p?.mrn}</Link> · {p?.age}y {p?.gender}</span></div>
        <div className="noprint" style={{ display: 'flex', gap: 8 }}>
          {canEdit && (
            <select value={c.status} disabled={saving} onChange={e => setStatus(e.target.value)} style={{ width: 'auto' }}>
              <option value="open">Open</option><option value="review">Needs review</option><option value="closed">Closed</option></select>)}
          <button className="ghost" onClick={() => window.print()}>🖨 Print</button>
          <button onClick={() => api.openPdf(c.id)}>📄 PDF</button>
        </div>
      </div>

      <div className={`banner ${c.triage_level}`}><span>TRIAGE: {c.triage_level.toUpperCase()}</span><span>{c.red_flags.length} alert(s)</span></div>
      {c.red_flags.map((f, i) => <div key={i} className={`flag ${f.level}`}><b>{f.level.toUpperCase()}</b> — {f.message}</div>)}

      <div className="grid g4" style={{ margin: '16px 0' }}>
        <Vital label="Temperature" value={c.temp_c} unit=" °C" bad={c.temp_c >= 38} />
        <Vital label="Pulse" value={c.pulse} unit=" bpm" bad={c.pulse > 100 || c.pulse < 50} />
        <Vital label="Blood pressure" value={c.bp_sys ? `${c.bp_sys}/${c.bp_dia ?? '–'}` : null} unit="" bad={c.bp_sys >= 140 || c.bp_sys < 90} />
        <Vital label="Resp rate" value={c.resp_rate} unit="/min" bad={c.resp_rate > 20} />
        <Vital label="SpO₂" value={c.spo2} unit="%" bad={c.spo2 < 94} />
        <Vital label="BMI" value={c.bmi} unit="" />
      </div>

      <div className="grid g2">
        <div className="card">
          <h2>Presenting complaint</h2>
          <p><b>{c.chief_complaint}</b></p>
          <dl className="kv"><dt>Duration</dt><dd>{c.duration || '—'}</dd><dt>Onset</dt><dd>{c.onset || '—'}</dd><dt>Pain</dt><dd>{c.pain_score}/10</dd></dl>
          <p>{c.hpi}</p>
        </div>
        <div className="card">
          <h2>History</h2>
          <dl className="kv">
            <dt>Symptoms</dt><dd>{list(c.symptoms)}</dd><dt>Past history</dt><dd>{list(c.past_history)}</dd>
            <dt>Family history</dt><dd>{list(c.family_history)}</dd><dt>Allergies</dt><dd><b style={{ color: c.allergies.length ? 'var(--crit)' : undefined }}>{list(c.allergies)}</b></dd>
            <dt>Medications</dt><dd>{list(c.medications)}</dd>
            <dt>Lifestyle</dt><dd>{Object.entries(c.lifestyle || {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}</dd>
          </dl>
        </div>
        <div className="card"><h2>Examination</h2><p>{c.examination || 'Not recorded'}</p></div>
        <div className="card"><h2>Diagnosis &amp; plan</h2><p><b>{c.diagnosis || 'Pending'}</b></p><p style={{ whiteSpace: 'pre-wrap' }}>{c.plan || 'No plan recorded'}</p>
          <span className={`badge ${c.status}`}>{c.status}</span></div>
      </div>
      <p className="muted" style={{ marginTop: 16 }}>Alerts are decision-support only and do not replace clinical judgement.</p>
    </>
  )
}
