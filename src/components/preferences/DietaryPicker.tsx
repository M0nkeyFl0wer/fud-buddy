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
    <div className="flex flex-wrap justify-center gap-3">
      {DIETARY.map(item => (
        <Button
          key={item.id}
          variant={selected.includes(item.id) ? 'default' : 'outline'}
          onClick={() => toggle(item.id)}
          className={`text-lg py-5 px-5 rounded-2xl transition-all transform hover:scale-105 ${
            selected.includes(item.id) ? 'scale-105 shadow-lg' : ''
          }`}
        >
          <span className="text-2xl mr-2">{item.icon}</span>
          <span>{item.label}</span>
        </Button>
      )      )}
      <Button variant="outline" onClick={() => onChange([])} className="text-lg py-5 px-5 rounded-2xl">
        None
      </Button>
    </div>
  );
}
