import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface HoverInspect {
  tag: string;
  component: string | null;
  classes: string[];
  rect: DOMRect;
  x: number;
  y: number;
}

interface DebugOutlineContextValue {
  enabled: boolean;
  toggle: () => void;
}

const DebugOutlineContext = createContext<DebugOutlineContextValue>({
  enabled: false,
  toggle: () => {},
});

export function useDebugOutline() {
  return useContext(DebugOutlineContext);
}

const STORAGE_KEY = 'tws-debug-outline';
const IGNORE_ATTR = 'data-debug-ui';

function parseTailwindClasses(el: Element): string[] {
  if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) return [];
  const raw = el.getAttribute('class') ?? '';
  return raw
    .split(/\s+/)
    .map(c => c.trim())
    .filter(Boolean)
    .filter(c => !c.startsWith('debug-outline'));
}

function findComponentName(el: Element | null): string | null {
  const host = el?.closest('[data-debug-component]');
  return host?.getAttribute('data-debug-component') ?? null;
}

function isDebugUi(el: Element | null): boolean {
  return Boolean(el?.closest(`[${IGNORE_ATTR}]`));
}

export function DebugOutlineProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [hover, setHover] = useState<HoverInspect | null>(null);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (enabled) {
      root.classList.add('debug-outline-on');
    } else {
      root.classList.remove('debug-outline-on');
      setHover(null);
    }
    return () => root.classList.remove('debug-outline-on');
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (event: PointerEvent) => {
      const el = document.elementFromPoint(event.clientX, event.clientY);
      if (!el || isDebugUi(el)) {
        setHover(null);
        return;
      }

      // Prefer the deepest element that actually carries Tailwind classes
      let target: Element | null = el;
      while (target && parseTailwindClasses(target).length === 0) {
        target = target.parentElement;
      }
      if (!target || isDebugUi(target)) {
        setHover(null);
        return;
      }

      const classes = parseTailwindClasses(target);
      const rect = target.getBoundingClientRect();
      setHover({
        tag: target.tagName.toLowerCase(),
        component: findComponentName(target),
        classes,
        rect,
        x: event.clientX,
        y: event.clientY,
      });
    };

    const onLeave = () => setHover(null);

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [enabled]);

  const value = useMemo(() => ({ enabled, toggle }), [enabled, toggle]);

  const tipStyle = useMemo(() => {
    if (!hover) return undefined;
    const pad = 12;
    const tipW = 360;
    const tipH = 220;
    let left = hover.x + pad;
    let top = hover.y + pad;
    if (left + tipW > window.innerWidth - 8) left = hover.x - tipW - pad;
    if (top + tipH > window.innerHeight - 8) top = hover.y - tipH - pad;
    return { left: Math.max(8, left), top: Math.max(8, top) };
  }, [hover]);

  return (
    <DebugOutlineContext.Provider value={value}>
      {children}

      <div data-debug-ui className="contents">
        <button
          type="button"
          data-debug-ui
          onClick={toggle}
          title={enabled ? '关闭组件边框调试' : '开启组件边框调试'}
          className={`fixed bottom-5 right-5 z-[9999] h-11 w-11 rounded-full shadow-lg border text-sm font-semibold transition-colors ${
            enabled
              ? 'bg-accent-yellow text-text-dark border-accent-yellow'
              : 'bg-bg-secondary text-text-primary border-border hover:bg-bg-secondary/80'
          }`}
        >
          CSS
        </button>

        {enabled && hover && (
          <>
            <div
              data-debug-ui
              className="fixed z-[9998] pointer-events-none border-2 border-accent-cyan bg-accent-cyan/10"
              style={{
                left: hover.rect.left,
                top: hover.rect.top,
                width: hover.rect.width,
                height: hover.rect.height,
              }}
            />
            <div
              data-debug-ui
              className="fixed z-[9999] pointer-events-none max-w-[360px] max-h-[240px] overflow-auto rounded-md border border-border bg-bg-secondary/95 p-2 shadow-xl text-[11px] text-text-primary"
              style={tipStyle}
            >
              <div className="mb-1 font-semibold text-accent-cyan">
                &lt;{hover.tag}&gt;
                {hover.component ? (
                  <span className="ml-1 text-accent-yellow">· {hover.component}</span>
                ) : null}
              </div>
              {hover.classes.length === 0 ? (
                <div className="text-text-secondary">无 Tailwind class</div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {hover.classes.map(cls => (
                    <span
                      key={cls}
                      className="rounded bg-bg-primary px-1.5 py-0.5 text-accent-green border border-border"
                    >
                      {cls}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-1.5 text-text-secondary break-all">
                {hover.classes.join(' ') || '(empty)'}
              </div>
            </div>
          </>
        )}
      </div>
    </DebugOutlineContext.Provider>
  );
}
