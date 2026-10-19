import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { session } from './api'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import PatientDetail from './pages/PatientDetail'
import CaseWizard from './pages/CaseWizard'
import CaseView from './pages/CaseView'
import Audit from './pages/Audit'

function Shell({ children }) {
  const nav = useNavigate()
  const user = session.user
  if (!session.token) return <Navigate to="/login" replace />
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">🩺 CaseWise</div>
        <nav className="nav">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/patients">Patients</NavLink>
          <NavLink to="/cases/new">+ New Case</NavLink>
          {user?.role === 'admin' && <NavLink to="/audit">Audit Log</NavLink>}
        </nav>
        <div className="who">
          <b>{user?.name}</b><br /><span style={{ opacity: .8 }}>{user?.role}</span>
          <button className="ghost" onClick={() => { session.clear(); nav('/login') }}>Sign out</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Shell><Dashboard /></Shell>} />
      <Route path="/patients" element={<Shell><Patients /></Shell>} />
      <Route path="/patients/:id" element={<Shell><PatientDetail /></Shell>} />
      <Route path="/cases/new" element={<Shell><CaseWizard /></Shell>} />
      <Route path="/cases/:id" element={<Shell><CaseView /></Shell>} />
      <Route path="/audit" element={<Shell><Audit /></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
