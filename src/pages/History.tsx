import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { clearHistory, listHistory, removeHistoryEntry, updateHistoryFeedback, type HistoryEntry } from '@/services/history';

function _formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export default function HistoryPage() {
  const [version, setVersion] = useState(0);

  const entries = useMemo(() => {
    void version;
    return listHistory();
  }, [version]);

  const handleDelete = (id: string) => {
    removeHistoryEntry(id);
    setVersion((v) => v + 1);
  };

  const handleClear = () => {
    clearHistory();
    setVersion((v) => v + 1);
  };

  const setThumb = (e: HistoryEntry, liked: boolean) => {
    updateHistoryFeedback(e.id, { rating: liked ? 5 : 1 });
    setVersion((v) => v + 1);
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="icon" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="text-xl font-bold">History</div>
            <div className="text-xs text-muted-foreground">Saved on this device.</div>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleClear} disabled={entries.length === 0} className="gap-2">
          <Trash2 className="h-4 w-4" />
          Clear
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="text-sm text-muted-foreground">No saved sessions yet. Use Share + Save after a result.</div>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {e.recommendations?.[0]?.restaurant?.name || 'Session'}
                    {e.recommendations?.[1]?.restaurant?.name ? ` + ${e.recommendations[1].restaurant.name}` : ''}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {_formatWhen(e.createdAt)}
                    {e.preferences?.location ? ` · ${e.preferences.location}` : ''}
                    {e.preferences?.vibe?.[0] ? ` · ${e.preferences.vibe[0]}` : ''}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-1">{e.id.slice(0, 8)}</div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={e.feedback?.rating === 5 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setThumb(e, true)}
                    className="gap-1"
                    aria-label="Thumbs up"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={e.feedback?.rating === 1 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setThumb(e, false)}
                    className="gap-1"
                    aria-label="Thumbs down"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleDelete(e.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 text-sm">
                {e.recommendations?.map((r, idx) => (
                  <div key={`${e.id}-${idx}`} className="mt-2">
                    <div className="font-medium">{idx === 0 ? 'Option A' : 'Option B'}: {r.restaurant?.name}</div>
                    {r.restaurant?.address ? (
                      <div className="text-xs text-muted-foreground">{r.restaurant.address}</div>
                    ) : null}
                    {r.dishes?.[0]?.name ? (
                      <div className="text-xs text-muted-foreground">Order: {r.dishes[0].name}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
