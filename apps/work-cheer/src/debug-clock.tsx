import { useState, type FormEvent } from 'react'
import { invoke } from '@tauri-apps/api/core'

function inputTime(timestamp: number) {
  const date = new Date(timestamp)
  return new Date(timestamp - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 19)
}

export function DebugClock() {
  const [value, setValue] = useState(() => {
    const initialTime = new URLSearchParams(window.location.search).get('simulatedAt')
    const timestamp = initialTime === null ? Date.now() : Number(initialTime)
    return inputTime(Number.isFinite(new Date(timestamp).getTime()) ? timestamp : Date.now())
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function changeTime(timestamp: number | null) {
    setError('')
    setMessage('')
    setBusy(true)
    try {
      await invoke('set_debug_time', { timestamp })
      if (timestamp === null) setValue(inputTime(Date.now()))
      setMessage(timestamp === null ? '已恢复真实时间。' : '已应用调试时间。')
    } catch {
      setError('无法更新时间，请检查日期并重试。')
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const timestamp = new Date(value).getTime()
    if (Number.isFinite(timestamp)) void changeTime(timestamp)
  }

  return (
    <main className="debug-panel">
      <h1>调试时间</h1>
      <p className="muted">从指定时间开始继续走，工作时段内收入实时增加。重启后恢复真实时间。</p>
      <form onSubmit={submit}>
        <div className="fields debug-fields">
          <label>模拟日期和时间<input type="datetime-local" step="1" value={value} onChange={(event) => setValue(event.currentTarget.value)} required /></label>
        </div>
        <div className="form-actions">
          <button type="button" className="secondary" disabled={busy} onClick={() => void changeTime(null)}>恢复真实时间</button>
          <button type="submit" className="primary" disabled={busy}>应用时间</button>
        </div>
        {error ? <p className="error" role="alert">{error}</p> : <p className="debug-message" role="status">{message}</p>}
      </form>
    </main>
  )
}
