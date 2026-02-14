import { DIETARY } from '@/services/preferences';
import { Button } from '@/components/ui/button';

interface DietaryPickerProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function DietaryPicker({ selected, onChange }: DietaryPickerProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Dietary restrictions (optional)
      </div>
      <div className="flex flex-wrap gap-2">
        {DIETARY.map(item => (
          <Button
            key={item.id}
            variant={selected.includes(item.id) ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggle(item.id)}
            className="gap-2"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
