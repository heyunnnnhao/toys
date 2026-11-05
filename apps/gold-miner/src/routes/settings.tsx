import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useSelector } from '@tanstack/react-store';
import { useEffect, useState } from 'react';
import { ACTIONS, ACTION_NAMES, keyLabel, type Action } from '@/config/keys';
import { rebind, resetKeymap, setVolume, settingsStore } from '@/stores/settings';
import { audio } from '@/ui/audio';

export const Route = createFileRoute('/settings')({ component: SettingsPage });

function SettingsPage() {
  const settings = useSelector(settingsStore, (s) => s);
  const router = useRouter();
  const [listening, setListening] = useState<Action | null>(null);
  const [lastKey, setLastKey] = useState<string>('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      setLastKey(e.code);
      if (!listening) return;
      e.preventDefault();
      rebind(listening, e.code);
      setListening(null);
      audio.play('click');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [listening]);

  return (
    <div className="page">
      <div className="page-narrow" style={{ maxWidth: 720 }}>
        <div className="page-header">
          <h1>⚙️ 设置</h1>
          <button className="btn secondary" onClick={() => router.history.back()}>
            ← 返回
          </button>
        </div>

        <div className="panel">
          <h2>音量</h2>
          <div className="row">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ width: 48, textAlign: 'right' }}>{Math.round(settings.volume * 100)}%</span>
            <button className="btn small secondary" onClick={() => audio.play('cash-big')}>
              试听
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="row" style={{ marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>按键</h2>
            <span className="spacer" />
            <button className="btn small secondary" onClick={resetKeymap}>
              恢复默认
            </button>
          </div>
          <p className="muted small" style={{ marginTop: 0 }}>
            点击"改键"后按下新按键。按键按物理位置识别，不受输入法影响。最近按下：{lastKey ? <kbd>{keyLabel(lastKey)}</kbd> : '—'}
            （可用来测试键盘是否支持两人同时按键）
          </p>
          <table className="keys">
            <tbody>
              {ACTIONS.map((a) => (
                <tr key={a}>
                  <td>{ACTION_NAMES[a]}</td>
                  <td>
                    {settings.keymap[a].map((c) => (
                      <kbd key={c} style={{ marginRight: 4 }}>
                        {keyLabel(c)}
                      </kbd>
                    ))}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn small secondary" onClick={() => setListening(a)}>
                      {listening === a ? '请按键…' : '改键'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
