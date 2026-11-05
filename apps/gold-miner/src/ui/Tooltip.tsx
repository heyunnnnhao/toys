import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

const GAP = 10;
const MARGIN = 8;
const LONG_PRESS_MS = 450;
/** how long a long-press tooltip stays up after the finger lifts */
const TOUCH_LINGER_MS = 1600;
const MOVE_TOLERANCE = 10;

/** Only one tooltip is open at a time; opening one closes the previous (e.g. a lingering long-press bubble). */
let closeOpen: (() => void) | null = null;

/**
 * Bubble rendered into document.body with fixed positioning, so no panel, card or
 * stacking context can cover it. Flips above/below and clamps to the viewport.
 */
function Bubble({
  anchor,
  placement,
  children,
}: {
  anchor: DOMRect;
  placement: 'top' | 'bottom';
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const fitsAbove = anchor.top - GAP - height >= MARGIN;
    const fitsBelow = anchor.bottom + GAP + height <= window.innerHeight - MARGIN;
    const above = placement === 'top' ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;
    const top = above ? anchor.top - GAP - height : anchor.bottom + GAP;
    const left = Math.min(
      Math.max(anchor.left + anchor.width / 2 - width / 2, MARGIN),
      window.innerWidth - width - MARGIN,
    );
    setPos({ left, top: Math.max(MARGIN, top) });
  }, [anchor, placement]);

  return createPortal(
    <div
      ref={ref}
      className={`tip ${pos ? 'shown' : ''}`}
      role="tooltip"
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}
    >
      {children}
    </div>,
    document.body,
  );
}

/**
 * Shows `content` next to the children: on mouse hover, keyboard focus, or a long press on touch screens.
 * A long press swallows the click that follows it, so it never also triggers the wrapped button.
 */
export function Tip({
  content,
  children,
  block = false,
  placement = 'top',
}: {
  content: ReactNode;
  children: ReactNode;
  block?: boolean;
  placement?: 'top' | 'bottom';
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const longPressed = useRef(false);
  const linger = useRef(0);

  // stable identity, so the single-open-tooltip bookkeeping can compare it
  const hide = useCallback(function hideTip() {
    window.clearTimeout(linger.current);
    setAnchor(null);
    if (closeOpen === hideTip) closeOpen = null;
  }, []);
  const show = () => {
    if (closeOpen && closeOpen !== hide) closeOpen();
    closeOpen = hide;
    window.clearTimeout(linger.current);
    if (ref.current) setAnchor(ref.current.getBoundingClientRect());
  };
  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  // a scrolled or resized page would leave the bubble floating in the wrong place
  useEffect(() => {
    if (!anchor) return;
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [anchor, hide]);

  useEffect(
    () => () => {
      cancelPress();
      window.clearTimeout(linger.current);
    },
    [],
  );

  const onPointerDownCapture = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    longPressed.current = false;
    cancelPress();
    press.current = {
      x: e.clientX,
      y: e.clientY,
      timer: window.setTimeout(() => {
        longPressed.current = true;
        show();
        navigator.vibrate?.(10);
      }, LONG_PRESS_MS),
    };
  };
  const onPointerMove = (e: PointerEvent) => {
    const p = press.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_TOLERANCE) cancelPress();
  };
  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    cancelPress();
    if (longPressed.current) linger.current = window.setTimeout(hide, TOUCH_LINGER_MS);
  };
  const onClickCapture = (e: MouseEvent) => {
    if (!longPressed.current) return;
    longPressed.current = false;
    e.preventDefault();
    e.stopPropagation();
  };
  const onFocus = (e: FocusEvent) => {
    // keyboard focus only; a tap also focuses the button and would leave the bubble stuck open
    if ((e.target as HTMLElement).matches?.(':focus-visible')) show();
  };

  return (
    <span
      ref={ref}
      className={`tip-wrap ${block ? 'tip-block' : ''}`}
      onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
      onPointerLeave={(e) => e.pointerType === 'mouse' && hide()}
      onPointerDownCapture={onPointerDownCapture}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
      onContextMenu={(e) => e.preventDefault()}
      onFocus={onFocus}
      onBlur={hide}
    >
      {children}
      {anchor && (
        <Bubble anchor={anchor} placement={placement}>
          {content}
        </Bubble>
      )}
    </span>
  );
}
