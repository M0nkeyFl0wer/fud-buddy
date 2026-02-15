import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, RefreshCw, Sparkles, Copy, Check, ChevronLeft, ChevronRight, Share2, History, Bookmark, ThumbsDown, ThumbsUp } from 'lucide-react';
import { apiClient, Message, UserPreferences } from '@/services/api';
import { SEARCHING_MESSAGES, RESULT_INTROS, PRICEY_INTROS, CHEAP_INTROS } from '@/services/messages';
import LogoMark from '@/components/LogoMark';
import { loadUserProfile } from '@/services/profile';
import { ShareDialog } from '@/components/ShareDialog';
import { SaveDialog } from '@/components/SaveDialog';
import { features } from '@/services/features';
import { upsertHistoryEntry, updateHistoryFeedback } from '@/services/history';
import { FoodVegas } from '@/components/FoodVegas';

interface StreamingChatProps {
  preferences: UserPreferences;
  onBack: () => void;
  onGenerateImage?: () => void;
}

interface Recommendation {
  restaurant: {
    name: string;
    address: string;
    rating?: number;
    priceRange: string;
  };
  whatToWear?: string;
  order?: {
    main?: string;
    side?: string;
    drink?: string;
  };
  backupOrder?: {
    main?: string;
    side?: string;
    drink?: string;
  };
  maps?: {
    google?: string;
    apple?: string;
  };
  imageUrl?: string;
  dishes?: {
    name: string;
    description: string;
  }[];
  story: string;
}

type Source = {
  title: string;
  url: string;
  engine?: string;
};

export function StreamingChat({ preferences, onBack, onGenerateImage }: StreamingChatProps) {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [resultIntro, setResultIntro] = useState('');

  const [sources, setSources] = useState<Source[]>([]);
  const [showSources, setShowSources] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionCreatedAt, setSessionCreatedAt] = useState<string | null>(null);
  const [feedbackWent, setFeedbackWent] = useState<boolean | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);

  const [cuteIndex, setCuteIndex] = useState(0);
  const [llmInfo, setLlmInfo] = useState<{ provider: string; model: string } | null>(null);

  const formatError = (msg: string): string => {
    const prefix = 'openrouter_error ';
    if (!msg.startsWith(prefix)) return msg;
    const raw = msg.slice(prefix.length);
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return msg;
      const p = parsed as Record<string, unknown>;
      const model = typeof p.model === 'string' ? p.model : '';
      const suggestions = Array.isArray(p.suggestions) ? p.suggestions.filter((s) => typeof s === 'string') : [];
      const base = model ? `OpenRouter rejected model id: ${model}` : 'OpenRouter rejected the selected model id.';
      if (suggestions.length > 0) {
        return `${base} Try: ${suggestions.slice(0, 3).join(', ')} (set in /config).`;
      }
      return `${base} Update it in /config.`;
    } catch {
      return msg;
    }
  };

  const generateRecommendations = useCallback(() => {
    setIsStreaming(true);
    setError(null);
    setRecommendations([]);
    setCurrentIndex(0);

    setSessionId(null);
    setSessionCreatedAt(null);
    setSources([]);
    setShowSources(false);
    setFeedbackWent(null);
    setFeedbackRating(null);
    setCuteIndex(Math.floor(Math.random() * SEARCHING_MESSAGES.length));
    setLlmInfo(null);
    
    // Random searching message
    setStatusMessage(SEARCHING_MESSAGES[Math.floor(Math.random() * SEARCHING_MESSAGES.length)]);
    
    // Random result intro
    setResultIntro(RESULT_INTROS[Math.floor(Math.random() * RESULT_INTROS.length)]);

    const systemPrompt = `You are FUD Buddy, a witty, opinionated food recommendation assistant. 
    
User preferences:
- Location: ${preferences.location || 'near them'}
- Vibe: ${preferences.vibe?.join(', ') || 'any'}
- Cuisines: ${preferences.cuisine?.join(', ') || 'any'}
- Dietary: ${preferences.dietary?.join(', ') || 'none'}

Your job:
1. Find 2 restaurant options matching their preferences
2. First option: slightly cheaper/more casual
3. Second option: slightly more expensive/upscale
4. For each, tell them exactly what to order (specific dishes)
5. Add a charming little story about the food or the place

Format your response as JSON array like:
[
  {
    "restaurant": {"name": "", "address": "", "priceRange": "$/$$/$$$/$$$$"},
    "dishes": [{"name": "", "description": ""}],
    "story": ""
  }
]

Be helpful, be specific, be charming. Return ONLY valid JSON, no other text.`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Find me somewhere to eat!' },
    ];

    apiClient.streamChat(
      messages,
      preferences,
      (event) => {
        if (!event || typeof event !== 'object') return;

        if (event.type === 'meta') {
          const llm = (event as { llm?: unknown }).llm;
          if (llm && typeof llm === 'object') {
            const provider = (llm as { provider?: unknown }).provider;
            const model = (llm as { model?: unknown }).model;
            if (typeof provider === 'string' && typeof model === 'string') {
              setLlmInfo({ provider, model });
            }
          }
          return;
        }

        if (event.type === 'status' && typeof event.content === 'string') {
          setStatusMessage(event.content);
          return;
        }

        if (event.type === 'error') {
          const msg = typeof event.message === 'string' ? event.message : 'Backend error';
          setError(formatError(msg));
          return;
        }

        const idx = (event as { index?: unknown }).index;
        const recObj = (event as { recommendation?: unknown }).recommendation;
        const patchObj = (event as { patch?: unknown }).patch;

        if (event.type === 'option' && typeof idx === 'number' && typeof recObj === 'object' && recObj) {
          setRecommendations((prev) => {
            const next = prev.slice();
            next[idx] = recObj as Recommendation;
            // Trim any trailing empties
            return next.filter(Boolean);
          });
          return;
        }

        if (event.type === 'enrich' && typeof idx === 'number' && typeof patchObj === 'object' && patchObj) {
          setRecommendations((prev) => {
            const next = prev.slice();
            const existing = next[idx];
            if (!existing) return prev;
            next[idx] = { ...existing, ...(patchObj as Partial<Recommendation>) };
            return next;
          });
          return;
        }

        if (event.type === 'result' && Array.isArray(event.recommendations)) {
          setRecommendations(event.recommendations);
          if (typeof event.sessionId === 'string') {
            setSessionId(event.sessionId);
            setSessionCreatedAt(new Date().toISOString());
          }

          if (Array.isArray(event.sources)) {
            const cleaned = event.sources
              .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
              .map((s) => ({
                title: typeof s.title === 'string' ? s.title : '',
                url: typeof s.url === 'string' ? s.url : '',
                engine: typeof s.engine === 'string' ? s.engine : undefined,
              }))
              .filter((s) => s.url);
            setSources(cleaned.slice(0, 8));
          }
          return;
        }

        // delta is intentionally ignored; we render option/enrich events instead.
      },
      () => {
        setIsStreaming(false);
      },
      (err) => {
        setIsStreaming(false);
        setError(err.message);
      }
    );
  }, [preferences]);

  useEffect(() => {
    generateRecommendations();
  }, [generateRecommendations]);

  useEffect(() => {
    if (!isStreaming) return;
    const t = window.setInterval(() => {
      setCuteIndex((i) => (i + 1) % SEARCHING_MESSAGES.length);
    }, 1600);
    return () => window.clearInterval(t);
  }, [isStreaming]);

  const handleCopy = () => {
    const rec = recommendations[currentIndex];
    if (!rec) return;

    const orderLines = rec.order
      ? [
          rec.order.main ? `Main: ${rec.order.main}` : null,
          rec.order.side ? `Side: ${rec.order.side}` : null,
          rec.order.drink ? `Drink: ${rec.order.drink}` : null,
        ].filter(Boolean)
      : [];
    
    const dishesText = rec.dishes?.map(d => `- ${d.name}: ${d.description}`).join('\n') || '';
    const orderText = orderLines.length > 0 ? orderLines.map((l) => `- ${l}`).join('\n') : dishesText;

    const text = `**${rec.restaurant.name}** - ${rec.restaurant.priceRange}
 ${rec.restaurant.address}

${rec.whatToWear ? `What to wear: ${rec.whatToWear}\n` : ''}

 **What to get:**
 ${orderText}

 ${rec.story}`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const current = recommendations[currentIndex];

  const previewDish = current?.order?.main || current?.dishes?.[0]?.name;
  const profile = loadUserProfile();

  const persistSessionToHistory = useCallback((allow: boolean) => {
    if (!allow) return;
    if (!sessionId || recommendations.length === 0) return;
    upsertHistoryEntry({
      id: sessionId,
      createdAt: sessionCreatedAt || new Date().toISOString(),
      preferences,
      recommendations,
      sources,
      feedback: {
        rating: feedbackRating === null ? undefined : feedbackRating,
        went: feedbackWent === null ? undefined : feedbackWent,
      },
    });
  }, [feedbackRating, feedbackWent, preferences, recommendations, sessionCreatedAt, sessionId, sources]);

  const quickThumb = async (liked: boolean) => {
    const rating = liked ? 5 : 1;
    setFeedbackRating(rating);

    if (!sessionId) return;
    updateHistoryFeedback(sessionId, { rating });

    // Try backend if available; ignore if unavailable.
    try {
      await apiClient.post<Record<string, unknown>>('/api/feedback', {
        session_id: sessionId,
        rating,
      });
    } catch {
      // noop
    }
  };

  const markWent = async (went: boolean) => {
    setFeedbackWent(went);
    if (!sessionId) return;
    updateHistoryFeedback(sessionId, { went });
    try {
      await apiClient.post<Record<string, unknown>>('/api/feedback', {
        session_id: sessionId,
        went,
      });
    } catch {
      // noop
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <LogoMark size={40} />
            </div>
            <div>
              <h2 className="font-semibold">FUD Buddy</h2>
              <p className="text-xs text-muted-foreground">
                {preferences.location} · {preferences.vibe?.[0] || preferences.cuisine?.[0] || 'any'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {onGenerateImage && (
            <Button variant="outline" size="sm" onClick={onGenerateImage}>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={generateRecommendations} disabled={isStreaming} title="Refresh">
            {isStreaming ? (
              <LogoMark size={18} className="animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
            {error}
          </div>
        )}

        {isStreaming && recommendations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <RefreshCw className="w-8 h-8 animate-spin mb-4" />
            <p className="text-sm">{SEARCHING_MESSAGES[cuteIndex] || 'Finding you options...'}</p>
            <p className="text-xs mt-2 opacity-80">{statusMessage || 'Cooking...'} </p>
            <div className="mt-5 w-full">
              <FoodVegas density={10} />
            </div>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="relative">
            {/* Swipe navigation */}
            {recommendations.length > 1 && (
              <div className="flex justify-center gap-4 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground self-center">
                  {currentIndex + 1} of {recommendations.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentIndex(i => Math.min(recommendations.length - 1, i + 1))}
                  disabled={currentIndex === recommendations.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {current && (
              <Card className="p-6 space-y-4">
                {llmInfo ? (
                  <div className="text-[11px] text-muted-foreground text-center">
                    Using {llmInfo.provider} · <span className="font-mono">{llmInfo.model}</span>
                  </div>
                ) : null}
                {isStreaming && (
                  <div className="text-xs text-muted-foreground text-center">
                    Still cooking the next option…
                  </div>
                )}
                {current.imageUrl ? (
                  <div className="-mx-6 -mt-6">
                    <img
                      src={current.imageUrl}
                      alt=""
                      className="h-44 w-full object-cover rounded-t-lg"
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground italic mb-3">
                    "{resultIntro}"
                  </p>
                  <div className="flex items-center gap-2 justify-center">
                    <h3 className="text-xl font-bold">{current.restaurant.name}</h3>
                    <span className="text-sm text-muted-foreground">
                      {current.restaurant.priceRange}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {current.restaurant.address}
                  </p>

                  {current.maps?.google || current.maps?.apple ? (
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      {current.maps.google ? (
                        <a href={current.maps.google} target="_blank" rel="noreferrer">
                          <Button type="button" variant="outline" size="sm">Google Maps</Button>
                        </a>
                      ) : null}
                      {current.maps.apple ? (
                        <a href={current.maps.apple} target="_blank" rel="noreferrer">
                          <Button type="button" variant="outline" size="sm">Apple Maps</Button>
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {current.whatToWear ? (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <span className="font-semibold">What to wear:</span> {current.whatToWear}
                  </div>
                ) : null}

                <div className="space-y-3">
                  {(current.order?.main || current.order?.side || current.order?.drink) ? (
                    <div>
                      <h4 className="font-semibold mb-2">Order this:</h4>
                      <div className="grid gap-1 text-sm">
                        {current.order?.main ? <div><span className="text-muted-foreground">Main:</span> {current.order.main}</div> : null}
                        {current.order?.side ? <div><span className="text-muted-foreground">Side:</span> {current.order.side}</div> : null}
                        {current.order?.drink ? <div><span className="text-muted-foreground">Drink:</span> {current.order.drink}</div> : null}
                      </div>
                    </div>
                  ) : null}

                  {(current.backupOrder?.main || current.backupOrder?.side || current.backupOrder?.drink) ? (
                    <div>
                      <h4 className="font-semibold mb-2">Backup:</h4>
                      <div className="grid gap-1 text-sm">
                        {current.backupOrder?.main ? <div><span className="text-muted-foreground">Main:</span> {current.backupOrder.main}</div> : null}
                        {current.backupOrder?.side ? <div><span className="text-muted-foreground">Side:</span> {current.backupOrder.side}</div> : null}
                        {current.backupOrder?.drink ? <div><span className="text-muted-foreground">Drink:</span> {current.backupOrder.drink}</div> : null}
                      </div>
                    </div>
                  ) : null}

                  {(!current.order?.main && current.dishes && current.dishes.length > 0) ? (
                    <div>
                      <h4 className="font-semibold mb-2">What to get:</h4>
                      <ul className="space-y-2">
                        {current.dishes.map((dish, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-primary">•</span>
                            <span>
                              <strong>{dish.name}</strong> — {dish.description}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">The story:</h4>
                  <p className="text-muted-foreground italic">{current.story}</p>
                </div>

                {sources.length > 0 && (
                  <div className="border-t pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSources((v) => !v)}
                      className="px-0"
                    >
                      {showSources ? 'Hide sources' : 'Show sources'}
                    </Button>

                    {showSources && (
                      <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                        {sources.map((s) => (
                          <div key={s.url} className="break-words">
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                              className="underline underline-offset-2"
                            >
                              {s.title || s.url}
                            </a>
                            {s.engine ? <span className="ml-2 opacity-70">({s.engine})</span> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {!isStreaming && recommendations.length === 0 && !error && (
          <div className="text-center text-muted-foreground py-8">
            <p>No recommendations found. Try adjusting your preferences.</p>
          </div>
        )}
      </div>

      {recommendations.length > 0 && !isStreaming && (
        <div className="border-t">
          <div className="p-4 flex flex-wrap gap-2 items-center">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>

            <span className="text-xs text-muted-foreground ml-1">Did you go?</span>
            <Button
              type="button"
              variant={feedbackWent === true ? 'default' : 'outline'}
              size="sm"
              onClick={() => void markWent(true)}
            >
              Yep
            </Button>
            <Button
              type="button"
              variant={feedbackWent === false ? 'default' : 'outline'}
              size="sm"
              onClick={() => void markWent(false)}
            >
              Nope
            </Button>

            <Button
              variant={feedbackRating === 5 ? 'default' : 'outline'}
              size="sm"
              onClick={() => void quickThumb(true)}
              className="gap-2"
              title="Thumbs up"
            >
              <ThumbsUp className="w-4 h-4" />
            </Button>
            <Button
              variant={feedbackRating === 1 ? 'default' : 'outline'}
              size="sm"
              onClick={() => void quickThumb(false)}
              className="gap-2"
              title="Thumbs down"
            >
              <ThumbsDown className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsShareOpen(true)} className="gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsSaveOpen(true)} className="gap-2">
              <Bookmark className="w-4 h-4" />
              Save
            </Button>
            {features.enableLocalHistory ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/history')}
                className="gap-2"
                disabled={!profile?.consentSaveHistory}
                title={profile?.consentSaveHistory ? 'View history' : 'Connect to save history'}
              >
                <History className="w-4 h-4" />
                History
              </Button>
            ) : null}
            <Button variant="default" size="lg" onClick={generateRecommendations} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try again
            </Button>
          </div>
        </div>
      )}

      <ShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        recommendations={recommendations.map((r) => ({
          restaurant: {
            name: r.restaurant.name,
            address: r.restaurant.address,
            priceRange: r.restaurant.priceRange,
          },
          whatToWear: r.whatToWear,
          order: r.order,
          backupOrder: r.backupOrder,
          imageUrl: r.imageUrl,
          maps: r.maps,
        }))}
        initialIndex={currentIndex}
        vibe={preferences.vibe?.[0]}
        location={preferences.location}
      />

      <SaveDialog
        open={isSaveOpen}
        onOpenChange={setIsSaveOpen}
        onSaved={(p) => {
          persistSessionToHistory(Boolean(p.consentSaveHistory));
        }}
      />
    </div>
  );
}
