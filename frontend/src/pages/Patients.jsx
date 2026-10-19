import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

const EMPTY = { name: '', age: '', gender: 'Male', phone: '', blood_group: '', address: '', emergency_contact: '' }

export default function Patients() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [list, setList] = useState([])
  const [show, setShow] = useState(false)
  const [f, setF] = useState(EMPTY)
  const [err, setErr] = useState('')

  useEffect(() => {
    const t = setTimeout(() => api.patients(q).then(setList).catch(e => setErr(e.message)), 250)
    return () => clearTimeout(t)
  }, [q])

  const set = k => e => setF({ ...f, [k]: e.target.value })

  async function save(e) {
    e.preventDefault(); setErr('')
    try {
      const body = { ...f, age: Number(f.age) }
      Object.keys(body).forEach(k => body[k] === '' && delete body[k])
      const p = await api.createPatient(body)
      nav(`/cases/new?patient=${p.id}`)
    } catch (ex) { setErr(ex.message) }
  }

  return (
    <>
      <div className="head">
        <div><h1>Patients</h1><span className="muted">Search by name, phone or MRN</span></div>
        <button onClick={() => setShow(!show)}>{show ? 'Close' : '+ Register patient'}</button>
      </div>

      {show && (
        <form className="card" onSubmit={save} style={{ marginBottom: 16 }}>
          <h2>New patient</h2>
          {err && <div className="err">{err}</div>}
          <div className="row">
            <div><label>Full name *</label><input required value={f.name} onChange={set('name')} /></div>
            <div><label>Age *</label><input required type="number" min="0" max="120" value={f.age} onChange={set('age')} /></div>
            <div><label>Gender *</label>
              <select value={f.gender} onChange={set('gender')}><option>Male</option><option>Female</option><option>Other</option></select></div>
            <div><label>Phone</label><input value={f.phone} onChange={set('phone')} /></div>
            <div><label>Blood group</label>
              <select value={f.blood_group} onChange={set('blood_group')}><option value="">Unknown</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b}>{b}</option>)}</select></div>
          </div>
          <div className="row">
            <div><label>Address</label><input value={f.address} onChange={set('address')} /></div>
            <div><label>Emergency contact</label><input value={f.emergency_contact} onChange={set('emergency_contact')} /></div>
          </div>
          <button>Save &amp; start case →</button>
        </form>
      )}

      <div className="card">
        <input placeholder="🔍 Search patients…" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 12 }} />
        {err && !show && <div className="err">{err}</div>}
        <table>
          <thead><tr><th>MRN</th><th>Name</th><th>Age / Sex</th><th>Phone</th><th>Blood</th><th></th></tr></thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id}>
                <td className="muted">{p.mrn}</td><td><Link to={`/patients/${p.id}`}><b>{p.name}</b></Link></td>
                <td>{p.age} / {p.gender}</td><td>{p.phone || '—'}</td><td>{p.blood_group || '—'}</td>
                <td><Link to={`/cases/new?patient=${p.id}`}>New case</Link></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan="6" className="muted">No patients found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
