import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

type ScriptStatus = 'idle' | 'loading' | 'loaded' | 'blocked' | 'error';

type TrackerScript = {
  id: string;
  label: string;
  url: string;
};

function loadScript(url: string): Promise<ScriptStatus> {
  return new Promise((resolve) => {
    const el = document.createElement('script');
    el.async = true;
    el.src = url;
    el.onload = () => resolve('loaded');
    el.onerror = () => resolve('blocked');
    document.head.appendChild(el);
  });
}

export function TrackerDemo() {
  const scripts: TrackerScript[] = useMemo(
    () => [
      {
        id: 'gtm',
        label: 'Google Tag Manager (demo)',
        url: 'https://www.googletagmanager.com/gtag/js?id=G-DEMO0000',
      },
      {
        id: 'meta',
        label: 'Meta Pixel Library (demo)',
        url: 'https://connect.facebook.net/en_US/fbevents.js',
      },
      {
        id: 'doubleclick',
        label: 'DoubleClick (demo)',
        url: 'https://stats.g.doubleclick.net/dc.js',
      },
      {
        id: 'segment',
        label: 'Segment Analytics (demo)',
        url: 'https://cdn.segment.com/analytics.js/v1/DEMO/analytics.min.js',
      },
      {
        id: 'clarity',
        label: 'Microsoft Clarity (demo)',
        url: 'https://www.clarity.ms/tag/DEMO',
      },
    ],
    []
  );

  const [status, setStatus] = useState<Record<string, ScriptStatus>>(
    Object.fromEntries(scripts.map((s) => [s.id, 'idle']))
  );
  const [isRunning, setIsRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);

  const loaded = Object.values(status).filter((s) => s === 'loaded').length;
  const blocked = Object.values(status).filter((s) => s === 'blocked').length;
  const total = scripts.length;

  const run = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setStartedAt(performance.now());
    setFinishedAt(null);
    setStatus(Object.fromEntries(scripts.map((s) => [s.id, 'loading'])));

    for (const s of scripts) {
      // Load sequentially so the UI updates in a visible way.
      // Blockers often cause onerror immediately.
      // Some services may still load but be unusable with demo IDs.
      // That's fine - this is a "requests" demo.
      const result = await loadScript(s.url);
      setStatus((prev) => ({ ...prev, [s.id]: result }));
    }

    setFinishedAt(performance.now());
    setIsRunning(false);
  };

  const reset = () => {
    setStatus(Object.fromEntries(scripts.map((s) => [s.id, 'idle'])));
    setStartedAt(null);
    setFinishedAt(null);
  };

  const elapsedMs =
    startedAt != null && finishedAt != null ? Math.round(finishedAt - startedAt) : null;

  return (
    <div className="space-y-3">
      <div className="text-[10px] text-muted-foreground">
        Demo mode loads well-known tracking libraries (with dummy IDs) so you can see what
        blockers like Privacy Badger stop. This is opt-in and intended for education.
      </div>

      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={run}
          disabled={isRunning}
          className="rounded-xl"
        >
          {isRunning ? 'Loading trackers...' : 'Load Tracker Demo'}
        </Button>
        <Button variant="outline" size="sm" onClick={reset} disabled={isRunning} className="rounded-xl">
          Reset
        </Button>
      </div>

      <div className="text-[10px]">
        Loaded: {loaded}/{total} · Blocked: {blocked}/{total}
        {elapsedMs != null ? ` · Elapsed: ${elapsedMs}ms` : ''}
      </div>

      <div className="space-y-1">
        {scripts.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-2 text-[10px]">
            <span className="truncate">{s.label}</span>
            <span
              className={
                status[s.id] === 'loaded'
                  ? 'text-emerald-600'
                  : status[s.id] === 'blocked'
                    ? 'text-destructive'
                    : 'text-muted-foreground'
              }
            >
              {status[s.id]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
