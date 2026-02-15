import { useMemo } from 'react';

type FoodVegasProps = {
  density?: number;
  label?: string;
};

type FoodId = 'pizza' | 'ramen' | 'taco' | 'burger' | 'sushi' | 'donut' | 'boba' | 'salad';

function FoodSvg({ id }: { id: FoodId }) {
  // Simple inline illustrations (no external assets).
  // Keep shapes bold so they read at small sizes.
  switch (id) {
    case 'pizza':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className="fv-svg">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffd18a" />
              <stop offset="1" stopColor="#ff9b5b" />
            </linearGradient>
          </defs>
          <path d="M10 14c18 2 32 10 44 30L32 58C22 42 14 28 10 14Z" fill="url(#g)" />
          <path d="M12 16c14 2 28 8 40 26" stroke="#8a3b2a" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
          <circle cx="28" cy="32" r="3" fill="#b11b2b" />
          <circle cx="36" cy="38" r="3" fill="#b11b2b" />
          <circle cx="32" cy="46" r="3" fill="#b11b2b" />
          <circle cx="22" cy="40" r="2.6" fill="#2f7d3b" />
          <circle cx="40" cy="46" r="2.6" fill="#2f7d3b" />
        </svg>
      );
    case 'ramen':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className="fv-svg">
          <path d="M14 28h36l-3 18c-1 7-7 12-15 12H32c-8 0-14-5-15-12l-3-18Z" fill="#f2f2f2" />
          <path d="M14 28h36" stroke="#e56a54" strokeWidth="6" strokeLinecap="round" />
          <path d="M20 34c6-3 12-3 18 0s12 3 18 0" stroke="#c49a4a" strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="26" cy="42" r="4" fill="#f3c94f" />
          <circle cx="38" cy="45" r="3" fill="#7b3f2a" />
          <path d="M42 16l12-6" stroke="#b78d6a" strokeWidth="4" strokeLinecap="round" />
          <path d="M38 22l12-6" stroke="#b78d6a" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 'taco':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className="fv-svg">
          <path d="M14 44c0-14 12-26 26-26h10c0 14-12 26-26 26H14Z" fill="#ffd36c" />
          <path d="M18 42c3-10 12-18 22-20" stroke="#c6862a" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
          <path d="M24 22c2 3 6 6 12 7s10 4 12 9" stroke="#2f7d3b" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="38" cy="34" r="3" fill="#b11b2b" />
          <circle cx="30" cy="30" r="2.6" fill="#b11b2b" />
        </svg>
      );
    case 'burger':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className="fv-svg">
          <path d="M16 30c2-10 12-16 24-16s22 6 24 16" fill="#f6c07a" />
          <path d="M16 30h48" stroke="#d38b4c" strokeWidth="4" strokeLinecap="round" />
          <path d="M18 34h44" stroke="#2f7d3b" strokeWidth="5" strokeLinecap="round" />
          <path d="M18 39h44" stroke="#6b2f1c" strokeWidth="7" strokeLinecap="round" />
          <path d="M18 45h44" stroke="#f3c94f" strokeWidth="6" strokeLinecap="round" />
          <path d="M18 50h44" stroke="#e1a35a" strokeWidth="10" strokeLinecap="round" />
          <circle cx="28" cy="22" r="1.4" fill="#fff" opacity="0.9" />
          <circle cx="36" cy="20" r="1.4" fill="#fff" opacity="0.9" />
          <circle cx="42" cy="24" r="1.4" fill="#fff" opacity="0.9" />
        </svg>
      );
    case 'sushi':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className="fv-svg">
          <rect x="14" y="22" width="36" height="28" rx="10" fill="#1e1e1e" />
          <rect x="18" y="26" width="28" height="20" rx="8" fill="#f2f2f2" />
          <rect x="24" y="28" width="12" height="16" rx="6" fill="#ff7a57" />
          <circle cx="42" cy="36" r="3" fill="#2f7d3b" />
        </svg>
      );
    case 'donut':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className="fv-svg">
          <circle cx="32" cy="32" r="20" fill="#f4c08a" />
          <circle cx="32" cy="32" r="8" fill="#2b1a12" opacity="0.25" />
          <path d="M16 28c2-8 10-16 16-16 10 0 18 7 20 16" fill="#ff7aa8" opacity="0.9" />
          <circle cx="22" cy="30" r="1.6" fill="#fff" />
          <circle cx="28" cy="22" r="1.6" fill="#fff" />
          <circle cx="40" cy="24" r="1.6" fill="#fff" />
          <circle cx="44" cy="32" r="1.6" fill="#fff" />
        </svg>
      );
    case 'boba':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className="fv-svg">
          <path d="M22 18h20l-2 36c0 4-3 6-8 6h-0c-5 0-8-2-8-6l-2-36Z" fill="#f2f2f2" opacity="0.9" />
          <path d="M24 34h16l-1 18c0 2-2 3-7 3s-7-1-7-3l-1-18Z" fill="#c49a4a" opacity="0.85" />
          <circle cx="28" cy="50" r="2.6" fill="#2b1a12" />
          <circle cx="36" cy="50" r="2.6" fill="#2b1a12" />
          <circle cx="32" cy="54" r="2.6" fill="#2b1a12" />
          <path d="M30 10h12" stroke="#8a5cff" strokeWidth="4" strokeLinecap="round" />
          <path d="M36 10v10" stroke="#8a5cff" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 'salad':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className="fv-svg">
          <path d="M16 30h32l-3 14c-2 8-8 14-13 14h0c-5 0-11-6-13-14l-3-14Z" fill="#f2f2f2" />
          <path d="M18 30c3-10 10-16 14-16 6 0 12 6 14 16" fill="#2f7d3b" opacity="0.95" />
          <circle cx="26" cy="30" r="3" fill="#ff7a57" />
          <circle cx="40" cy="32" r="3" fill="#ff7a57" />
          <circle cx="32" cy="36" r="3" fill="#f3c94f" />
        </svg>
      );
  }
}

function makeSequence(n: number, ids: FoodId[]): FoodId[] {
  const out: FoodId[] = [];
  for (let i = 0; i < n; i++) {
    out.push(ids[i % ids.length]);
  }
  return out;
}

export function FoodVegas({ density = 10, label = 'Spinning for snacks...' }: FoodVegasProps) {
  const ids: FoodId[] = useMemo(() => ['pizza', 'ramen', 'taco', 'burger', 'sushi', 'donut', 'boba', 'salad'], []);
  const items = useMemo(() => makeSequence(density, ids), [density, ids]);

  return (
    <div className="fv-wrap" aria-label={label}>
      <div className="fv-strip" aria-hidden="true">
        {items.map((id, i) => (
          <div
            key={`${id}-${i}`}
            className="fv-chip"
            style={{
              animationDelay: `${(i % 8) * 120}ms`,
            }}
          >
            <FoodSvg id={id} />
          </div>
        ))}
      </div>
    </div>
  );
}
