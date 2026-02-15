import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, RefreshCw, Sparkles, Copy, Check, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { apiClient, Message, UserPreferences } from '@/services/api';
import { SEARCHING_MESSAGES, RESULT_INTROS, PRICEY_INTROS, CHEAP_INTROS } from '@/services/messages';
import LogoMark from '@/components/LogoMark';
import { ShareAccountDialog } from '@/components/ShareAccountDialog';
import { loadUserProfile } from '@/services/profile';

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
  dishes: {
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
  const [feedbackWent, setFeedbackWent] = useState<boolean | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const [isShareOpen, setIsShareOpen] = useState(false);

  const generateRecommendations = useCallback(() => {
    setIsStreaming(true);
    setError(null);
    setRecommendations([]);
    setCurrentIndex(0);

    setSessionId(null);
    setSources([]);
    setShowSources(false);
    setFeedbackWent(null);
    setFeedbackRating(null);
    setFeedbackComment('');
    setFeedbackSent(false);
    setFeedbackError(null);
    
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

        if (event.type === 'status' && typeof event.content === 'string') {
          setStatusMessage(event.content);
          return;
        }

        if (event.type === 'error') {
          const msg = typeof event.message === 'string' ? event.message : 'Backend error';
          setError(msg);
          return;
        }

        if (event.type === 'result' && Array.isArray(event.recommendations)) {
          setRecommendations(event.recommendations);
          if (typeof event.sessionId === 'string') {
            setSessionId(event.sessionId);
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

        // Optional: we can show streaming JSON output later; for now ignore delta.
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

  const submitFeedback = useCallback(async () => {
    if (!sessionId || isSendingFeedback || feedbackSent) return;

    setIsSendingFeedback(true);
    setFeedbackError(null);
    try {
      const resp = await apiClient.post<Record<string, unknown>>('/api/feedback', {
        session_id: sessionId,
        went: feedbackWent === null ? undefined : feedbackWent,
        rating: feedbackRating === null ? undefined : feedbackRating,
        comment: feedbackComment.trim() || undefined,
        consent_contact: false,
        consent_public: false,
      });

      if (resp?.status !== 'ok') {
        const msg = typeof resp?.message === 'string' ? resp.message : 'Feedback unavailable';
        throw new Error(msg);
      }
      setFeedbackSent(true);
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : 'Failed to send feedback');
    } finally {
      setIsSendingFeedback(false);
    }
  }, [feedbackComment, feedbackRating, feedbackSent, feedbackWent, isSendingFeedback, sessionId]);

  useEffect(() => {
    generateRecommendations();
  }, [generateRecommendations]);

  const handleCopy = () => {
    const rec = recommendations[currentIndex];
    if (!rec) return;
    
    const text = `**${rec.restaurant.name}** - ${rec.restaurant.priceRange}
${rec.restaurant.address}

**What to get:**
${rec.dishes.map(d => `- ${d.name}: ${d.description}`).join('\n')}

${rec.story}`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const current = recommendations[currentIndex];

  const previewDish = current?.dishes?.[0]?.name;
  const savedName = loadUserProfile()?.displayName || '';

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
            <p>{statusMessage || 'Finding you options...'}</p>
          </div>
        )}

        {!isStreaming && recommendations.length > 0 && (
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
                </div>

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
          {sessionId && (
            <div className="p-4">
              <Card className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">How'd it go?</div>
                    <div className="text-xs text-muted-foreground">
                      Quick feedback helps tune the vibe and catch bad recs.
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">{sessionId.slice(0, 8)}</div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={feedbackWent === true ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFeedbackWent(true)}
                    disabled={feedbackSent}
                  >
                    I went
                  </Button>
                  <Button
                    type="button"
                    variant={feedbackWent === false ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFeedbackWent(false)}
                    disabled={feedbackSent}
                  >
                    Didn't go
                  </Button>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-muted-foreground mb-2">Rating</div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Button
                        key={n}
                        type="button"
                        variant={feedbackRating === n ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFeedbackRating(n)}
                        disabled={feedbackSent}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-muted-foreground mb-2">Notes (optional)</div>
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="What landed? What was off?"
                    className="w-full min-h-[80px] rounded-md border bg-background p-3 text-sm"
                    disabled={feedbackSent}
                  />
                </div>

                {feedbackError && (
                  <div className="mt-2 text-sm text-destructive">{feedbackError}</div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <Button type="button" onClick={submitFeedback} disabled={feedbackSent || isSendingFeedback}>
                    {feedbackSent ? 'Thanks!' : isSendingFeedback ? 'Sending...' : 'Send feedback'}
                  </Button>
                  {feedbackSent && <div className="text-xs text-muted-foreground">Saved.</div>}
                </div>
              </Card>
            </div>
          )}

          <div className="p-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsShareOpen(true)} className="gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={generateRecommendations} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              New search
            </Button>
          </div>
        </div>
      )}

      <ShareAccountDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        defaultName={savedName}
        preview={
          current
            ? {
                restaurantName: current.restaurant.name,
                dishName: previewDish,
              }
            : undefined
        }
      />
    </div>
  );
}
