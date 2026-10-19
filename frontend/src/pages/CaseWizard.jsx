import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { TagInput, VoiceArea } from '../components'

const STEPS = ['Patient', 'Complaint', 'History', 'Systems & Lifestyle', 'Vitals & Exam', 'Diagnosis & Plan']

const SYSTEMS = {
  General: ['Fever', 'Fatigue', 'Weight loss', 'Night sweats', 'Loss of appetite'],
  Cardiovascular: ['Chest pain', 'Palpitations', 'Leg swelling', 'Breathlessness on exertion'],
  Respiratory: ['Cough', 'Wheeze', 'Shortness of breath', 'Coughing blood'],
  Gastrointestinal: ['Nausea', 'Vomiting', 'Diarrhoea', 'Constipation', 'Abdominal pain', 'Black stool'],
  Neurological: ['Headache', 'Dizziness', 'Numbness', 'Seizure', 'Blurred vision'],
  Genitourinary: ['Painful urination', 'Frequent urination', 'Blood in urine'],
  Musculoskeletal: ['Joint pain', 'Back pain', 'Muscle weakness'],
  Skin: ['Rash', 'Itching', 'Swelling'],
}
const COMMON_HISTORY = ['Diabetes', 'Hypertension', 'Asthma', 'Thyroid disorder', 'Heart disease', 'Tuberculosis', 'Kidney disease']
const COMMON_FAMILY = ['Diabetes', 'Hypertension', 'Heart disease', 'Cancer', 'Stroke']
const COMMON_ALLERGY = ['Penicillin', 'Sulfa', 'Aspirin', 'Dust', 'Peanuts', 'Latex']

const blank = {
  patient_id: null, chief_complaint: '', duration: '', onset: '', pain_score: 0, hpi: '',
  symptoms: [], past_history: [], family_history: [], allergies: [], medications: [],
  lifestyle: { smoking: '', alcohol: '', exercise: '', diet: '', occupation: '' },
  systems_review: {},
  temp_c: '', pulse: '', bp_sys: '', bp_dia: '', resp_rate: '', spo2: '', weight_kg: '', height_cm: '',
  examination: '', diagnosis: '', plan: '', status: 'open',
}

// Instant client-side hints; the server runs the authoritative triage on save
function liveWarnings(f) {
  const w = []
  const n = v => (v === '' || v == null ? null : Number(v))
  const spo2 = n(f.spo2), sys = n(f.bp_sys), dia = n(f.bp_dia), hr = n(f.pulse), t = n(f.temp_c), rr = n(f.resp_rate)
  if (spo2 != null && spo2 < 94) w.push(`SpO₂ ${spo2}% is low`)
  if (sys != null && (sys >= 180 || (dia ?? 0) >= 120)) w.push('Hypertensive crisis range')
  else if (sys != null && sys >= 140) w.push('Elevated blood pressure')
  if (sys != null && sys < 90) w.push('Low blood pressure')
  if (hr != null && (hr > 100 || hr < 50)) w.push(`Pulse ${hr} is abnormal`)
  if (t != null && t >= 38) w.push(`Fever ${t} °C`)
  if (rr != null && rr > 20) w.push(`Respiratory rate ${rr} is high`)
  const text = (f.chief_complaint + ' ' + f.hpi + ' ' + f.symptoms.join(' ')).toLowerCase()
  if (/chest pain|shortness of breath|slurred speech|unconscious|seizure/.test(text)) w.push('High-risk symptom mentioned')
  const meds = (f.medications.join(' ') + ' ' + f.plan).toLowerCase()
  if (f.allergies.some(a => a.toLowerCase().includes('penicillin')) && /amoxicillin|ampicillin|penicillin|augmentin/.test(meds))
    w.push('Penicillin allergy vs. penicillin-class drug')
  return w
}

export default function CaseWizard() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [step, setStep] = useState(params.get('patient') ? 1 : 0)
  const [f, setF] = useState(blank)
  const [patient, setPatient] = useState(null)
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))
  const inp = k => ({ value: f[k], onChange: e => set(k, e.target.value) })

  async function choose(pid) {
    const p = await api.patient(pid)
    setPatient(p)
    // Carry forward what we already know about this patient
    const uniq = key => [...new Set(p.cases.flatMap(c => c[key] || []))]
    setF(prev => ({ ...prev, patient_id: p.id, allergies: uniq('allergies'), past_history: uniq('past_history'),
      family_history: uniq('family_history'), medications: uniq('medications') }))
    setStep(1)
  }

  useEffect(() => { const pid = params.get('patient'); if (pid) choose(pid).catch(e => setErr(e.message)) }, []) // eslint-disable-line
  useEffect(() => {
    if (step !== 0) return
    const t = setTimeout(() => api.patients(q).then(setResults).catch(() => {}), 250)
    return () => clearTimeout(t)
  }, [q, step])

  const toggleSystem = (sys, s) => {
    const cur = f.systems_review[sys] || []
    const next = cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]
    const all = Object.values({ ...f.systems_review, [sys]: next }).flat()
    setF({ ...f, systems_review: { ...f.systems_review, [sys]: next }, symptoms: [...new Set([...f.symptoms.filter(x => !Object.values(SYSTEMS).flat().includes(x)), ...all])] })
  }

  const warnings = liveWarnings(f)
  const bmi = f.weight_kg && f.height_cm ? (f.weight_kg / (f.height_cm / 100) ** 2).toFixed(1) : null

  async function submit() {
    setErr('')
    if (!f.patient_id) return setErr('Select a patient first'), setStep(0)
    if (!f.chief_complaint.trim()) return setErr('Chief complaint is required'), setStep(1)
    setBusy(true)
    try {
      const body = { ...f }
      for (const k of ['temp_c', 'weight_kg', 'height_cm']) body[k] = f[k] === '' ? null : Number(f[k])
      for (const k of ['pulse', 'bp_sys', 'bp_dia', 'resp_rate', 'spo2']) body[k] = f[k] === '' ? null : parseInt(f[k], 10)
      const c = await api.createCase(body)
      nav(`/cases/${c.id}`)
    } catch (ex) { setErr(ex.message) } finally { setBusy(false) }
  }

  return (
    <>
      <div className="head"><div><h1>New case</h1>
        <span className="muted">{patient ? `${patient.name} · ${patient.mrn} · ${patient.age}y ${patient.gender}` : 'Guided case-taking'}</span></div></div>

      <div className="steps">
        {STEPS.map((s, i) => (
          <div key={s} className={`step ${i === step ? 'on' : i < step ? 'done' : ''}`}
            onClick={() => (i === 0 || f.patient_id) && setStep(i)}>{i + 1}. {s}</div>
        ))}
      </div>

      {err && <div className="err">{err}</div>}

      <div className="card">
        {step === 0 && (
          <>
            <h2>Select patient</h2>
            <input placeholder="🔍 Search by name, phone or MRN" value={q} onChange={e => setQ(e.target.value)} autoFocus />
            <table style={{ marginTop: 10 }}>
              <tbody>
                {results.slice(0, 8).map(p => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => choose(p.id)}>
                    <td><b>{p.name}</b></td><td>{p.age}y / {p.gender}</td><td className="muted">{p.mrn}</td><td>{p.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted">New patient? Register them first from the Patients page.</p>
          </>
        )}

        {step === 1 && (
          <>
            <h2>Presenting complaint</h2>
            <div className="field"><label>Chief complaint *</label>
              <input {...inp('chief_complaint')} placeholder="e.g. Chest pain, fever for 3 days" /></div>
            <div className="row">
              <div><label>Duration</label><input {...inp('duration')} placeholder="e.g. 3 days" /></div>
              <div><label>Onset</label>
                <select {...inp('onset')}><option value="">—</option><option value="sudden">Sudden</option><option value="gradual">Gradual</option></select></div>
              <div><label>Pain score: {f.pain_score}/10</label>
                <input type="range" min="0" max="10" value={f.pain_score} onChange={e => set('pain_score', Number(e.target.value))} /></div>
            </div>
            <VoiceArea label="History of present illness (tap 🎤 to dictate)" value={f.hpi} onChange={v => set('hpi', v)}
              placeholder="How did it start? What makes it better or worse? Associated symptoms?" />
          </>
        )}

        {step === 2 && (
          <>
            <h2>Medical history</h2>
            <TagInput label="Past medical history" value={f.past_history} onChange={v => set('past_history', v)} suggestions={COMMON_HISTORY} />
            <TagInput label="Family history" value={f.family_history} onChange={v => set('family_history', v)} suggestions={COMMON_FAMILY} />
            <TagInput label="⚠ Allergies" value={f.allergies} onChange={v => set('allergies', v)} suggestions={COMMON_ALLERGY} />
            <TagInput label="Current medications" value={f.medications} onChange={v => set('medications', v)} placeholder="e.g. Metformin 500mg" />
          </>
        )}

        {step === 3 && (
          <>
            <h2>Review of systems</h2>
            {Object.entries(SYSTEMS).map(([sys, list]) => (
              <div className="field" key={sys}><label>{sys}</label>
                <div className="chips" style={{ marginTop: 0 }}>
                  {list.map(s => {
                    const on = (f.systems_review[sys] || []).includes(s)
                    return <span key={s} className="chip" onClick={() => toggleSystem(sys, s)}
                      style={on ? { background: 'var(--brand)', color: '#fff', borderStyle: 'solid', borderColor: 'var(--brand)' } : {}}>{s}</span>
                  })}
                </div></div>
            ))}
            <TagInput label="Other symptoms" value={f.symptoms.filter(s => !Object.values(SYSTEMS).flat().includes(s))}
              onChange={v => set('symptoms', [...f.symptoms.filter(s => Object.values(SYSTEMS).flat().includes(s)), ...v])} />
            <h2 style={{ marginTop: 18 }}>Lifestyle</h2>
            <div className="row">
              {[['smoking', ['', 'Never', 'Former', 'Current']], ['alcohol', ['', 'None', 'Occasional', 'Regular']],
                ['exercise', ['', 'Sedentary', 'Light', 'Regular']], ['diet', ['', 'Vegetarian', 'Non-vegetarian', 'Vegan']]].map(([k, opts]) => (
                <div key={k}><label style={{ textTransform: 'capitalize' }}>{k}</label>
                  <select value={f.lifestyle[k]} onChange={e => set('lifestyle', { ...f.lifestyle, [k]: e.target.value })}>
                    {opts.map(o => <option key={o} value={o}>{o || '—'}</option>)}</select></div>
              ))}
              <div><label>Occupation</label><input value={f.lifestyle.occupation} onChange={e => set('lifestyle', { ...f.lifestyle, occupation: e.target.value })} /></div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2>Vitals</h2>
            <div className="row">
              <div><label>Temp (°C)</label><input type="number" step="0.1" {...inp('temp_c')} /></div>
              <div><label>Pulse (bpm)</label><input type="number" {...inp('pulse')} /></div>
              <div><label>BP systolic</label><input type="number" {...inp('bp_sys')} /></div>
              <div><label>BP diastolic</label><input type="number" {...inp('bp_dia')} /></div>
              <div><label>Resp rate</label><input type="number" {...inp('resp_rate')} /></div>
              <div><label>SpO₂ (%)</label><input type="number" {...inp('spo2')} /></div>
              <div><label>Weight (kg)</label><input type="number" step="0.1" {...inp('weight_kg')} /></div>
              <div><label>Height (cm)</label><input type="number" {...inp('height_cm')} /></div>
            </div>
            {bmi && <p className="muted">BMI: <b>{bmi}</b></p>}
            <VoiceArea label="Physical examination" value={f.examination} onChange={v => set('examination', v)} placeholder="General appearance, systemic findings…" />
          </>
        )}

        {step === 5 && (
          <>
            <h2>Diagnosis &amp; plan</h2>
            <div className="field"><label>Provisional diagnosis</label><input {...inp('diagnosis')} /></div>
            <VoiceArea label="Treatment plan / prescriptions / investigations" value={f.plan} onChange={v => set('plan', v)} />
            <div className="field"><label>Status</label>
              <select {...inp('status')}><option value="open">Open</option><option value="review">Needs review</option><option value="closed">Closed</option></select></div>
          </>
        )}

        {warnings.length > 0 && step >= 1 && (
          <div className="live"><b>⚠ Live clinical alerts</b>
            <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>{warnings.map(w => <li key={w}>{w}</li>)}</ul></div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22 }}>
          <button className="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</button>
          {step < 5
            ? <button disabled={step === 0 && !f.patient_id} onClick={() => setStep(step + 1)}>Next →</button>
            : <button disabled={busy} onClick={submit}>{busy ? 'Saving…' : '✔ Save case'}</button>}
        </div>
      </div>
    </>
  )
}
