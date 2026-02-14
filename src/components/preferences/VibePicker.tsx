import { VIBES } from '@/services/preferences';
import { Button } from '@/components/ui/button';

interface VibePickerProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  max?: number;
}

export function VibePicker({ selected, onChange, max = 2 }: VibePickerProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else if (selected.length < max) {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Select up to {max} vibes</span>
        <span>{selected.length}/{max} selected</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {VIBES.map(vibe => (
          <Button
            key={vibe.id}
            variant={selected.includes(vibe.id) ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggle(vibe.id)}
            className="gap-2"
            disabled={!selected.includes(vibe.id) && selected.length >= max}
          >
            <span>{vibe.icon}</span>
            <span>{vibe.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
