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
    <div className="flex flex-wrap justify-center gap-3">
      {CUISINES.map(cuisine => (
        <Button
          key={cuisine.id}
          variant={selected.includes(cuisine.id) ? 'default' : 'outline'}
          onClick={() => toggle(cuisine.id)}
          className={`text-lg py-6 px-5 rounded-2xl transition-all transform hover:scale-105 ${
            selected.includes(cuisine.id) ? 'scale-105 shadow-lg' : ''
          }`}
          disabled={!selected.includes(cuisine.id) && selected.length >= max}
        >
          <span className="text-2xl mr-2">{cuisine.icon}</span>
          <span>{cuisine.label}</span>
        </Button>
      ))}
    </div>
  );
}
