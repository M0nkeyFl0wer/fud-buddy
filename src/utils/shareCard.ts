type ShareCardData = {
  title: string;
  subtitle?: string;
  locationLine?: string;
  whatToWear?: string;
  orderMain?: string;
  orderSide?: string;
  orderDrink?: string;
  backupMain?: string;
  backupSide?: string;
  backupDrink?: string;
  imageUrl?: string;
  footer?: string;
};

function getApiBaseUrl(): string {
  // Keep consistent with ApiClient storage behavior.
  const stored = window.localStorage.getItem('fud_api_base_url');
  if (stored) return stored;

  const env = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (env) return env;

  if (window.location?.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return 'http://localhost:8000';
}

export function buildImageProxyUrl(remoteImageUrl?: string): string {
  if (!remoteImageUrl) return '';
  const base = getApiBaseUrl().replace(/\/$/, '');
  return `${base}/api/image-proxy?url=${encodeURIComponent(remoteImageUrl)}`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderShareCardSvg(data: ShareCardData): string {
  const width = 1080;
  const height = 1350;
  const img = buildImageProxyUrl(data.imageUrl);

  const title = esc(data.title);
  const subtitle = esc(data.subtitle || '');
  const locationLine = esc(data.locationLine || '');
  const whatToWear = esc(data.whatToWear || '');
  const footer = esc(data.footer || 'FUD Buddy');

  const order = [
    data.orderMain ? `Main: ${data.orderMain}` : '',
    data.orderSide ? `Side: ${data.orderSide}` : '',
    data.orderDrink ? `Drink: ${data.orderDrink}` : '',
  ]
    .filter(Boolean)
    .map(esc);

  const backup = [
    data.backupMain ? `Main: ${data.backupMain}` : '',
    data.backupSide ? `Side: ${data.backupSide}` : '',
    data.backupDrink ? `Drink: ${data.backupDrink}` : '',
  ]
    .filter(Boolean)
    .map(esc);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1220"/>
      <stop offset="0.55" stop-color="#0c1f2b"/>
      <stop offset="1" stop-color="#130f1a"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgba(255,255,255,0.10)"/>
      <stop offset="1" stop-color="rgba(255,255,255,0.03)"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="rgba(0,0,0,0.45)"/>
    </filter>
    <clipPath id="clipImg">
      <rect x="70" y="120" width="940" height="520" rx="38"/>
    </clipPath>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <circle cx="980" cy="160" r="160" fill="rgba(52,211,153,0.18)"/>
  <circle cx="120" cy="1220" r="220" fill="rgba(56,189,248,0.14)"/>

  <g filter="url(#shadow)">
    <rect x="60" y="80" width="960" height="1190" rx="44" fill="url(#glass)" stroke="rgba(255,255,255,0.10)"/>
  </g>

  ${img ? `<image href="${esc(img)}" x="70" y="120" width="940" height="520" preserveAspectRatio="xMidYMid slice" clip-path="url(#clipImg)"/>` : `<rect x="70" y="120" width="940" height="520" rx="38" fill="rgba(255,255,255,0.06)"/>`}

  <text x="90" y="725" font-family="ui-sans-serif, system-ui" font-size="68" font-weight="800" fill="#ffffff">${title}</text>
  ${subtitle ? `<text x="90" y="780" font-family="ui-sans-serif, system-ui" font-size="34" font-weight="600" fill="rgba(255,255,255,0.78)">${subtitle}</text>` : ''}
  ${locationLine ? `<text x="90" y="832" font-family="ui-sans-serif, system-ui" font-size="26" fill="rgba(255,255,255,0.65)">${locationLine}</text>` : ''}

  ${whatToWear ? `<text x="90" y="900" font-family="ui-sans-serif, system-ui" font-size="28" fill="rgba(255,255,255,0.85)">What to wear: ${whatToWear}</text>` : ''}

  <text x="90" y="990" font-family="ui-sans-serif, system-ui" font-size="34" font-weight="800" fill="#ffffff">Order This</text>
  ${order.map((l, i) => `<text x="90" y="${1040 + i * 44}" font-family="ui-sans-serif, system-ui" font-size="30" fill="rgba(255,255,255,0.82)">${l}</text>`).join('')}

  <text x="90" y="${1140 + Math.max(0, order.length - 1) * 44}" font-family="ui-sans-serif, system-ui" font-size="34" font-weight="800" fill="#ffffff">Backup</text>
  ${backup.map((l, i) => `<text x="90" y="${1190 + Math.max(0, order.length - 1) * 44 + i * 44}" font-family="ui-sans-serif, system-ui" font-size="30" fill="rgba(255,255,255,0.78)">${l}</text>`).join('')}

  <text x="90" y="1275" font-family="ui-sans-serif, system-ui" font-size="24" fill="rgba(255,255,255,0.55)">${footer}</text>
</svg>`;
}

export async function downloadShareCardPng(svg: string, fileName: string): Promise<void> {
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to render share card'));
    });

    img.src = url;
    await loaded;

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(img, 0, 0);

    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = fileName;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
