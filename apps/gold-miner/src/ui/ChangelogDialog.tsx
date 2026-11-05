import { useEffect } from 'react';
import { version } from '../../package.json';
import changelog from '../../CHANGELOG.md?raw';
import { Markdown } from './Markdown';

export const APP_VERSION = version;

/** Shows the repo's CHANGELOG.md (bundled at build time). */
export function ChangelogDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="更新日志"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>更新日志</h2>
          <span className="badge">当前 v{version}</span>
          <span className="spacer" />
          <button className="btn small secondary" onClick={onClose} autoFocus>
            关闭
          </button>
        </div>
        <div className="modal-body">
          <Markdown source={changelog} />
        </div>
      </div>
    </div>
  );
}
