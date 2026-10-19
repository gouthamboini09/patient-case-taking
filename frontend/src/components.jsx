import { useRef, useState } from 'react'

export function Badge({ level }) {
  return <span className={`badge ${level}`}>{level}</span>
}

export function TagInput({ label, value, onChange, suggestions = [], placeholder }) {
  const [text, setText] = useState('')
  const add = t => {
    const v = t.trim()
    if (v && !value.some(x => x.toLowerCase() === v.toLowerCase())) onChange([...value, v])
    setText('')
  }
  return (
    <div className="field">
      <label>{label}</label>
      <div className="tags">
        {value.map(t => <span className="tag" key={t}>{t}<b onClick={() => onChange(value.filter(x => x !== t))}>×</b></span>)}
      </div>
      <input value={text} placeholder={placeholder || 'Type and press Enter'}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(text) } }}
        onBlur={() => text && add(text)} />
      {suggestions.length > 0 && (
        <div className="chips">
          {suggestions.filter(s => !value.includes(s)).map(s => <span key={s} className="chip" onClick={() => add(s)}>+ {s}</span>)}
        </div>
      )}
    </div>
  )
}

// Textarea with browser speech-to-text dictation (Web Speech API)
export function VoiceArea({ label, value, onChange, placeholder }) {
  const rec = useRef(null)
  const [on, setOn] = useState(false)
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

  function toggle() {
    if (on) { rec.current?.stop(); return }
    const r = new SR()
    r.lang = 'en-IN'; r.continuous = true; r.interimResults = false
    r.onresult = e => {
      const said = Array.from(e.results).slice(e.resultIndex).map(x => x[0].transcript).join(' ')
      onChange((value ? value.trimEnd() + ' ' : '') + said.trim())
    }
    r.onend = () => setOn(false)
    r.start(); rec.current = r; setOn(true)
  }

  return (
    <div className="field mic">
      <label>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      {SR && <button type="button" className={`micbtn ${on ? 'rec' : ''}`} onClick={toggle}>{on ? '⏹ Stop' : '🎤 Dictate'}</button>}
    </div>
  )
}

export function Field({ label, children }) {
  return <div><label>{label}</label>{children}</div>
}
