import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Check, ChevronDown } from 'lucide-react';
import { DIETARY } from '@/services/preferences';

interface DietaryRestrictionsDropdownProps {
  selected: string[];
  onChange: (next: string[]) => void;
}

export function DietaryRestrictionsDropdown({ selected, onChange }: DietaryRestrictionsDropdownProps) {
  const [open, setOpen] = useState(false);

  const selectedLabels = useMemo(() => {
    const set = new Set(selected);
    return DIETARY.filter((d) => set.has(d.id)).map((d) => d.label);
  }, [selected]);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const summary =
    selectedLabels.length === 0
      ? 'None'
      : selectedLabels.length <= 2
        ? selectedLabels.join(', ')
        : `${selectedLabels.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-14 w-full justify-between rounded-2xl text-base"
        >
          <span className="text-left">
            <span className="block text-xs text-muted-foreground">Restrictions (optional)</span>
            <span className="block font-medium">{summary}</span>
          </span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="center"
        sideOffset={8}
      >
        <Command>
          <CommandInput placeholder="Search restrictions..." />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => onChange([])}
                className="gap-2"
                value="None"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border">
                  {selected.length === 0 ? <Check className="h-3 w-3" /> : null}
                </span>
                <span>None</span>
              </CommandItem>
              <CommandSeparator />
              {DIETARY.map((d) => {
                const isChecked = selected.includes(d.id);
                return (
                  <CommandItem
                    key={d.id}
                    onSelect={() => toggle(d.id)}
                    className="gap-2"
                    value={d.label}
                  >
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border">
                      {isChecked ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span>{d.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
