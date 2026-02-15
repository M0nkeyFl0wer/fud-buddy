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
    <div className="flex flex-wrap justify-center gap-3">
      {VIBES.map(vibe => (
        <Button
          key={vibe.id}
          variant={selected.includes(vibe.id) ? 'default' : 'outline'}
          onClick={() => toggle(vibe.id)}
          className={`text-lg py-6 px-5 rounded-2xl transition-all transform hover:scale-105 ${
            selected.includes(vibe.id) ? 'scale-105 shadow-lg' : ''
          }`}
          disabled={!selected.includes(vibe.id) && selected.length >= max}
        >
          <span className="text-2xl mr-2">{vibe.icon}</span>
          <span>{vibe.label}</span>
        </Button>
      ))}
    </div>
  );
}
