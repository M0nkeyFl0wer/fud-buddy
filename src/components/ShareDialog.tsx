import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Download, ExternalLink, Share2 } from 'lucide-react';
import { downloadShareCardPng, renderShareCardPngBlob, renderShareCardSvg } from '@/utils/shareCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type RecommendationLike = {
  restaurant: { name: string; address: string; priceRange?: string };
  whatToWear?: string;
  order?: { main?: string; side?: string; drink?: string };
  backupOrder?: { main?: string; side?: string; drink?: string };
  imageUrl?: string;
  maps?: { google?: string; apple?: string };
};

type ShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendations?: RecommendationLike[];
  initialIndex?: number;
  vibe?: string;
  location?: string;
};

export function ShareDialog({ open, onOpenChange, recommendations = [], initialIndex = 0, vibe, location }: ShareDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [active, setActive] = useState(String(initialIndex));

  useEffect(() => {
    if (!open) return;
    setActive(String(initialIndex));
  }, [initialIndex, open]);

  const recommendation = recommendations[Number(active) || 0];

  const svg = useMemo(() => {
    if (!recommendation) return '';
    const r = recommendation;
    return renderShareCardSvg({
      title: r.restaurant.name,
      subtitle: vibe ? `${vibe} pick` : 'FUD pick',
      locationLine: location || r.restaurant.address,
      whatToWear: r.whatToWear,
      orderMain: r.order?.main,
      orderSide: r.order?.side,
      orderDrink: r.order?.drink,
      backupMain: r.backupOrder?.main,
      backupSide: r.backupOrder?.side,
      backupDrink: r.backupOrder?.drink,
      imageUrl: r.imageUrl,
      footer: 'FUD Buddy',
    });
  }, [location, recommendation, vibe]);

  const caption = useMemo(() => {
    if (!recommendation) return '';
    const r = recommendation;
    const parts = [
      `Tonight: ${r.restaurant.name}`,
      r.order?.main ? `Order: ${r.order.main}` : '',
      r.order?.drink ? `Drink: ${r.order.drink}` : '',
      r.whatToWear ? `Wear: ${r.whatToWear}` : '',
      r.maps?.google ? r.maps.google : '',
      '#fudbuddy',
    ].filter(Boolean);
    return parts.join('\n');
  }, [recommendation]);

  useEffect(() => {
    if (!open || !svg) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [open, previewUrl, svg]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleDownload = async () => {
    if (!svg || !recommendation) return;
    const safeName = recommendation.restaurant.name.replace(/[^a-z0-9\-\s]/gi, '').trim().replace(/\s+/g, '-').toLowerCase();
    await downloadShareCardPng(svg, `fud-${safeName || 'share'}.png`);
  };

  const handleWebShare = async () => {
    try {
      if (!('share' in navigator)) return;
      const n = navigator as Navigator & { canShare?: (data: ShareData) => boolean; share: (data: ShareData) => Promise<void> };

      // Prefer sharing the image file when supported.
      if (svg) {
        const blob = await renderShareCardPngBlob(svg);
        const safeName = (recommendation?.restaurant.name || 'fud')
          .replace(/[^a-z0-9\-\s]/gi, '')
          .trim()
          .replace(/\s+/g, '-')
          .toLowerCase();
        const file = new File([blob], `fud-${safeName || 'share'}.png`, { type: 'image/png' });
        const data: ShareData = { title: 'FUD Buddy', text: caption, files: [file] };
        if (!n.canShare || n.canShare(data)) {
          await n.share(data);
          return;
        }
      }

      await n.share({ title: 'FUD Buddy', text: caption });
    } catch {
      // user cancelled
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
          <DialogDescription>
            Download a card, copy the caption, and post. If you have Instagram/Facebook installed and you’re signed in,
            “Share…” can hand it off directly.
          </DialogDescription>
        </DialogHeader>

        {recommendations.length > 1 ? (
          <Tabs value={active} onValueChange={setActive}>
            <TabsList className="w-full">
              {recommendations.slice(0, 2).map((r, idx) => (
                <TabsTrigger key={idx} value={String(idx)} className="flex-1">
                  {idx === 0 ? 'Option A' : 'Option B'}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : null}

        {previewUrl ? (
          <div className="rounded-lg overflow-hidden border bg-muted/20">
            <img src={previewUrl} alt="" className="w-full h-auto" />
          </div>
        ) : (
          <div className="rounded-lg border p-6 text-sm text-muted-foreground">Generate a recommendation first.</div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleDownload} disabled={!svg} className="gap-2">
            <Download className="h-4 w-4" />
            Download card
          </Button>
          <Button type="button" variant="outline" onClick={handleCopy} disabled={!caption} className="gap-2">
            <Copy className="h-4 w-4" />
            {copied ? 'Copied' : 'Copy caption'}
          </Button>
          {'share' in navigator ? (
            <Button type="button" variant="outline" onClick={handleWebShare} disabled={!caption} className="gap-2">
              <Share2 className="h-4 w-4" />
              Share…
            </Button>
          ) : null}
        </div>

        <div className="rounded-lg border p-3">
          <div className="text-sm font-medium">Post shortcuts</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer">
              <Button type="button" variant="outline" size="sm" className="gap-2">
                Instagram <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
            <a href="https://www.facebook.com/" target="_blank" rel="noreferrer">
              <Button type="button" variant="outline" size="sm" className="gap-2">
                Facebook <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            No account connection needed for sharing. If you aren’t logged in, Instagram/Facebook will prompt you.
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
