import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api'
import { Badge } from '../components'

const TRIAGE_COLORS = { critical: '#c62828', urgent: '#ef6c00', routine: '#2e7d32' }

export default function Dashboard() {
  const [s, setS] = useState(null)
  const [recent, setRecent] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    api.summary().then(setS).catch(e => setErr(e.message))
    api.cases('?limit=8').then(setRecent).catch(() => {})
  }, [])

  if (err) return <div className="err">{err}</div>
  if (!s) return <p className="muted">Loading…</p>

  const triage = Object.entries(s.triage).map(([name, value]) => ({ name, value }))

  return (
    <>
      <div className="head">
        <div><h1>Dashboard</h1><span className="muted">Live overview of your clinic</span></div>
        <Link className="btn" to="/cases/new">+ New Case</Link>
      </div>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <div className="card stat"><div className="num">{s.total_patients}</div><div className="lbl">Patients</div></div>
        <div className="card stat"><div className="num">{s.total_cases}</div><div className="lbl">Total cases</div></div>
        <div className="card stat"><div className="num">{s.cases_today}</div><div className="lbl">Cases today</div></div>
        <div className="card stat crit"><div className="num">{s.critical_open}</div><div className="lbl">Critical &amp; open</div></div>
      </div>

      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h2>Cases – last 14 days</h2>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={s.cases_per_day}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" fontSize={11} interval={1} /><YAxis allowDecimals={false} fontSize={11} />
              <Tooltip /><Line type="monotone" dataKey="count" stroke="#0b5ed7" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2>Triage mix</h2>
          {triage.length === 0 ? <p className="muted">No cases yet.</p> : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={triage} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} label>
                  {triage.map(t => <Cell key={t.name} fill={TRIAGE_COLORS[t.name]} />)}
                </Pie><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card">
          <h2>Top complaints</h2>
          {s.top_complaints.length === 0 ? <p className="muted">No data yet.</p> : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={s.top_complaints} layout="vertical" margin={{ left: 30 }}>
                <XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="name" width={120} fontSize={11} />
                <Tooltip /><Bar dataKey="count" fill="#0b5ed7" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card">
          <h2>Age groups</h2>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={Object.entries(s.age_groups).map(([name, count]) => ({ name, count }))}>
              <XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} />
              <Tooltip /><Bar dataKey="count" fill="#4aa3ff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2>Recent cases</h2>
        {recent.length === 0 ? <p className="muted">No cases yet — create the first one.</p> : (
          <table>
            <thead><tr><th>#</th><th>Patient</th><th>Complaint</th><th>Triage</th><th>Status</th><th>When</th></tr></thead>
            <tbody>
              {recent.map(c => (
                <tr key={c.id}>
                  <td><Link to={`/cases/${c.id}`}>{c.id}</Link></td>
                  <td>{c.patient?.name}</td><td>{c.chief_complaint}</td>
                  <td><Badge level={c.triage_level} /></td><td><span className={`badge ${c.status}`}>{c.status}</span></td>
                  <td className="muted">{new Date(c.created_at + 'Z').toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
