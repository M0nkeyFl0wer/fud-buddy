import { CUISINES } from '@/services/preferences';
import { Button } from '@/components/ui/button';

interface CuisinePickerProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  max?: number;
}

export function CuisinePicker({ selected, onChange, max = 3 }: CuisinePickerProps) {
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
        <span>Select up to {max} cuisines</span>
        <span>{selected.length}/{max} selected</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {CUISINES.map(cuisine => (
          <Button
            key={cuisine.id}
            variant={selected.includes(cuisine.id) ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggle(cuisine.id)}
            className="gap-2"
            disabled={!selected.includes(cuisine.id) && selected.length >= max}
          >
            <span>{cuisine.icon}</span>
            <span>{cuisine.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
