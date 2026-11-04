import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { DebugClock } from './debug-clock'
import { SettingsDialog } from './settings-dialog'
import { defaults, getWorkday, migrateSettings, validateReward, validateSettings, type DailyReward, type Settings } from './workday'
import appIcon from '../src-tauri/icons/work-cheer.svg?no-inline'
import './style.css'

const STORAGE_KEY = 'work-cheer.preferences.v1'
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const pad = (value: number) => String(value).padStart(2, '0')
const yuan = (value: number, digits = 2) => `¥${value.toFixed(digits)}`

interface Preferences {
  settings: Settings
  stoppedAt: number | null
  dailyRewards: Record<string, DailyReward>
}

interface Simulation {
  timestamp: number
  startedAt: number
}

function readClock() {
  return { wallTime: Date.now(), elapsedTime: performance.now() }
}

function simulatedTime(simulation: Simulation, elapsedTime: number) {
  return simulation.timestamp + Math.floor(elapsedTime - simulation.startedAt)
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function readRewards(saved: unknown, legacyCost: unknown, today: Date): Preferences['dailyRewards'] {
  if (typeof saved === 'object' && saved !== null) {
    return Object.fromEntries(Object.entries(saved).filter(([day, value]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && validateReward(value)))
  }
  const legacyReward = { name: '今日奖励', cost: legacyCost }
  return validateReward(legacyReward) ? { [dateKey(today)]: legacyReward } : {}
}

function readPreferences(): Preferences & { migrated?: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const saved = raw && JSON.parse(raw)
    const today = new Date()
    const settings = migrateSettings(saved?.settings, today)
    if (settings) {
      const stopped = saved.stoppedAt
      const stoppedAt = typeof stopped === 'number' && Number.isFinite(stopped) && stopped > 0 && stopped <= Date.now()
        ? stopped
        : null
      const dailyRewards = readRewards(saved.dailyRewards, saved.settings.rewardCost, today)
      return { settings, stoppedAt, dailyRewards, migrated: saved.dailyRewards === undefined || !validateSettings(saved.settings) }
    }
  } catch {
    // The dashboard can run with defaults if stored preferences are unavailable.
  }
  return { settings: defaults, stoppedAt: null, dailyRewards: {} }
}

function duration(seconds: number, includeSeconds = true) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60) % 60
  const prefix = hours > 0 ? `${hours}小时` : ''
  return `${prefix}${minutes}分${includeSeconds ? `${seconds % 60}秒` : ''}`
}

function App() {
  const [preferences, setPreferences] = useState(readPreferences)
  const [clock, setClock] = useState(readClock)
  const [simulation, setSimulation] = useState<Simulation | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [error, setError] = useState('')
  const { settings, stoppedAt, dailyRewards } = preferences
  const timerOn = simulation !== null || stoppedAt === null

  useEffect(() => {
    if (!preferences.migrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, stoppedAt, dailyRewards }))
    } catch {
      setError('旧设置迁移后未能保存。请在设置中重新保存。')
    }
  }, [preferences.migrated, settings, stoppedAt, dailyRewards])

  useEffect(() => {
    if (!isTauri()) return
    const subscription = getCurrentWebviewWindow().listen<'settings' | number | null>('work-cheer-action', ({ payload }) => {
      if (payload === 'settings') {
        setSettingsOpen(true)
      } else {
        const currentClock = readClock()
        setSimulation(payload === null ? null : { timestamp: payload, startedAt: currentClock.elapsedTime })
        setClock(currentClock)
      }
    })
    void subscription.catch(() => setError('桌面菜单或调试事件连接失败。'))
    return () => { void subscription.then((unlisten) => unlisten()).catch(() => {}) }
  }, [])

  useEffect(() => {
    if (!isTauri() || settingsOpen) return
    const openDebug = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || (event.code !== 'Backquote' && event.key !== '`')) return
      event.preventDefault()
      const simulatedAt = simulation ? simulatedTime(simulation, performance.now()) : null
      void invoke('open_debug', { simulatedAt }).catch(() => setError('无法打开调试窗口，请重试。'))
    }
    window.addEventListener('keydown', openDebug)
    return () => window.removeEventListener('keydown', openDebug)
  }, [settingsOpen, simulation])

  useEffect(() => {
    if (!timerOn) return
    const refresh = () => setClock(readClock())
    const timer = window.setInterval(refresh, 250)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [timerOn])

  function save(next: Preferences) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setPreferences(next)
      setError('')
      return true
    } catch {
      return false
    }
  }

  function toggle() {
    const timestamp = Date.now()
    if (save({ settings, dailyRewards, stoppedAt: stoppedAt === null ? timestamp : null })) setClock(readClock())
    else setError('计时状态保存失败，请重试。')
  }

  function saveSettings(next: Settings, day: string, reward: DailyReward | null) {
    const updated = { ...dailyRewards }
    if (reward) updated[day] = reward
    else delete updated[day]
    return save({ settings: next, stoppedAt, dailyRewards: updated })
  }

  const date = new Date(simulation ? simulatedTime(simulation, clock.elapsedTime) : stoppedAt ?? clock.wallTime)
  const localDay = dateKey(date)
  const localClock = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  const work = getWorkday(date, settings)
  const reward = dailyRewards[localDay]
  const rewardGap = reward ? reward.cost - work.todayPay : 0
  const rewardMessage = !reward
    ? '在「应用 → 设置」添加今日奖励目标。'
    : rewardGap <= 1e-9
      ? `今日奖励达成：${reward.name}（${yuan(reward.cost)}）`
      : `距离「${reward.name}」还差 ${yuan(Math.ceil(rewardGap * 100) / 100)}，约 ${duration(Math.ceil(rewardGap / work.perSecond / 60) * 60, false)}有薪工时。`
  const status = {
    working: ['上班中', `距离下班还有 ${duration(work.untilEnd)}`],
    before: ['等待上班', `距离上班还有 ${duration(work.untilStart)}`],
    break: ['午休中', `距离午休结束还有 ${duration(work.untilBreakEnds)}`],
    done: ['已下班', '今天辛苦了，下班快乐！'],
    weekend: ['休息日', '今天不上班，安心休息。'],
  }[work.phase]

  return (
    <>
      <header className="topbar">
        <div className="brand"><img src={appIcon} alt="" width="30" height="30" /><span>上班鼓励器</span></div>
        {simulation && <span className="debug-badge">调试时间</span>}
      </header>
      <main className="dashboard">
        <time className="timestamp" dateTime={`${localDay}T${localClock}`}>{localDay} {weekdays[date.getDay()]} {localClock}</time>
        <section className="shift" aria-label="上班状态">
          <h1>{timerOn ? status[0] : '计时已关闭'}</h1>
          <p>{timerOn ? status[1] : '重新开启后将按排班补算。'}</p>
        </section>
        <section className="earnings" aria-labelledby="earnings-title">
          <h2 id="earnings-title" className="muted">今日已赚</h2>
          <p className="earnings-value"><span>¥</span>{work.todayPay.toFixed(4)}</p>
          <p className="muted rate">当前赚钱速度 <strong>{yuan(work.phase === 'working' && timerOn ? work.perSecond : 0, 4)}</strong> / 秒</p>
          <p className="reward">{rewardMessage}</p>
        </section>
        <button type="button" className="primary timer-button" onClick={toggle} disabled={simulation !== null}>{stoppedAt === null ? '关闭计时器' : '开启计时器'}</button>
        {error && <p className="error" role="alert">{error}</p>}
        <section className="progress-section" aria-labelledby="progress-title">
          <h2 id="progress-title" className="muted">今日工时进度 {(work.progress * 100).toFixed(1)}%</h2>
          <p className="muted">已工作 {work.workedHours.toFixed(2)} / {work.shiftHours.toFixed(2)} 小时</p>
          <progress aria-labelledby="progress-title" value={work.progress} max={1} />
        </section>
        <section className="summary" aria-labelledby="month-title">
          <div className="month-row"><h2 className="muted" id="month-title">本月累计</h2><strong>{yuan(work.monthPay, 4)}</strong></div>
          <p className="muted">本月共 {work.monthWorkdays} 个工作日，过去的工作日按满勤计。</p>
        </section>
        <footer className="details muted">
          <p>折算时薪 <strong>{yuan(work.hourlyRate)}</strong></p>
          <p>{work.phase === 'weekend' ? '工作日满勤可得' : '今日满勤可得'} <strong>{yuan(work.fullDayPay)}</strong></p>
        </footer>
      </main>
      {settingsOpen && <SettingsDialog settings={settings} rewardDay={localDay} reward={reward} onClose={() => setSettingsOpen(false)} onSave={saveSettings} />}
    </>
  )
}

const isDebugWindow = isTauri() && getCurrentWebviewWindow().label === 'debug'
createRoot(document.getElementById('root')!).render(<StrictMode>{isDebugWindow ? <DebugClock /> : <App />}</StrictMode>)
