import { useEffect, useRef, useState, type FormEvent } from 'react'
import { validateReward, validateSettings, type DailyReward, type Settings } from './workday'

export function SettingsDialog({ settings, rewardDay, reward, onClose, onSave }: {
  settings: Settings
  rewardDay: string
  reward: DailyReward | undefined
  onClose: () => void
  onSave: (settings: Settings, day: string, reward: DailyReward | null) => boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState('')
  const [target] = useState(() => ({ day: rewardDay, reward }))

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const next = {
      start: String(fields.get('start')),
      end: String(fields.get('end')),
      breakStart: String(fields.get('breakStart')),
      breakEnd: String(fields.get('breakEnd')),
      monthlySalary: Number(fields.get('monthlySalary')),
      yearEndBonus: Number(fields.get('yearEndBonus')),
    }
    if (!validateSettings(next)) {
      setError('请检查时间顺序，确保休息时段在班次内且留有有薪工时。')
      return
    }
    const name = String(fields.get('rewardName')).trim()
    const cost = String(fields.get('rewardCost'))
    const nextReward = name || cost ? { name, cost: Number(cost) } : null
    if (nextReward && !validateReward(nextReward)) {
      setError('请同时填写奖励名称和金额。两项留空即可清除目标。')
      return
    }
    if (onSave(next, target.day, nextReward)) dialog.current?.close()
    else setError('本地设置保存失败，请重试。')
  }

  return (
    <dialog ref={dialog} onClose={onClose} aria-labelledby="settings-title">
      <form onSubmit={submit}>
        <h2 id="settings-title">计时设置</h2>
        <p className="muted settings-note">按周一至周五估算。午休两端填相同时间可取消午休。</p>
        <div className="fields">
          <label>上班时间<input type="time" name="start" defaultValue={settings.start} required /></label>
          <label>下班时间<input type="time" name="end" defaultValue={settings.end} required /></label>
          <label>午休开始<input type="time" name="breakStart" defaultValue={settings.breakStart} required /></label>
          <label>午休结束<input type="time" name="breakEnd" defaultValue={settings.breakEnd} required /></label>
          <label>月工资（元）<input type="number" name="monthlySalary" min="0.01" max="1000000000" step="0.01" defaultValue={settings.monthlySalary} required /></label>
          <label>年终奖（元）<input type="number" name="yearEndBonus" min="0" max="1000000000" step="0.01" defaultValue={settings.yearEndBonus} required /></label>
        </div>
        <p className="muted settings-note">年终奖按 12 个月均摊，与月工资合计后按当月工作日折算。</p>
        <fieldset className="reward-fields">
          <legend>奖励目标 · {target.day}</legend>
          <div className="fields">
            <label>奖励名称<input type="text" name="rewardName" maxLength={40} placeholder="例如：奶茶" defaultValue={target.reward?.name} /></label>
            <label>目标金额（元）<input type="number" name="rewardCost" min="0.01" max="1000000" step="0.01" defaultValue={target.reward?.cost} /></label>
          </div>
          <p className="muted settings-note">每个日期单独保存，两项留空可清除该日目标。</p>
        </fieldset>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="form-actions">
          <button type="button" className="secondary" onClick={() => dialog.current?.close()}>取消</button>
          <button type="submit" className="primary">保存设置</button>
        </div>
      </form>
    </dialog>
  )
}
