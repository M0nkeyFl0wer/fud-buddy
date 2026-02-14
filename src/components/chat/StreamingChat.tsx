import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, RefreshCw, Sparkles, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient, Message, UserPreferences } from '@/services/api';
import { SEARCHING_MESSAGES, RESULT_INTROS, PRICEY_INTROS, CHEAP_INTROS } from '@/services/messages';

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

export function StreamingChat({ preferences, onBack, onGenerateImage }: StreamingChatProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [resultIntro, setResultIntro] = useState('');

  const generateRecommendations = useCallback(() => {
    setIsStreaming(true);
    setError(null);
    setRecommendations([]);
    setCurrentIndex(0);
    
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

    let fullContent = '';

    apiClient.streamChat(
      messages,
      (chunk) => {
        fullContent += chunk;
      },
      () => {
        setIsStreaming(false);
        try {
          // Extract JSON from response
          const jsonMatch = fullContent.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            setRecommendations(parsed);
          }
        } catch (e) {
          setError('Failed to parse recommendations');
        }
      },
      (err) => {
        setIsStreaming(false);
        setError(err.message);
      }
    );
  }, [preferences]);

  useEffect(() => {
    generateRecommendations();
  }, []);

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

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="font-semibold">FUD Buddy</h2>
            <p className="text-xs text-muted-foreground">
              {preferences.location} · {preferences.vibe?.[0] || preferences.cuisine?.[0] || 'any'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {onGenerateImage && (
            <Button variant="outline" size="sm" onClick={onGenerateImage}>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={generateRecommendations} disabled={isStreaming}>
            <RefreshCw className={`w-4 h-4 ${isStreaming ? 'animate-spin' : ''}`} />
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
        <div className="p-4 border-t flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button variant="outline" size="sm" onClick={generateRecommendations} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            New search
          </Button>
        </div>
      )}
    </div>
  );
}
