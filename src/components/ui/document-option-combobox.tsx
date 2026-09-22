import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { getDocumentOptions, DocumentOption } from '@/services/documentOptionsService';

export interface DocumentOptionComboboxProps {
  category: 'activity' | 'source' | 'typeDocument' | 'assignedTo' | 'pourInfo';
  documentType?: 'incoming' | 'outgoing' | 'both';
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
}

export const DocumentOptionCombobox: React.FC<DocumentOptionComboboxProps> = ({
  category,
  documentType = 'both',
  value,
  onValueChange,
  placeholder = 'اختر...',
  emptyMessage = 'لا توجد نتائج مطابقة',
  className,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);

  // Charger les options dynamiquement depuis MongoDB via le service
  const { data: options = [], isLoading } = useQuery<DocumentOption[]>({
    queryKey: ['documentOptions', category, documentType],
    queryFn: () =>
      getDocumentOptions({
        category,
        documentType: documentType === 'both' ? undefined : documentType,
      }),
    staleTime: 1000 * 60 * 5,
  });

  // Dédupliquer les options par valeur pour éviter les doublons d'affichage
  const uniqueOptions = useMemo(() => {
    const seen = new Set<string>();
    return options.filter((opt) => {
      if (!opt.value || seen.has(opt.value)) return false;
      seen.add(opt.value);
      return true;
    });
  }, [options]);

  // Trouver l'option sélectionnée pour afficher son libellé
  const selectedOption = useMemo(() => {
    return uniqueOptions.find((opt) => opt.value === value);
  }, [uniqueOptions, value]);

  const displayLabel = selectedOption?.value || value;

  const handleSelect = (selectedValue: string) => {
    // Si déjà sélectionné, on désélectionne (vide), sinon on assigne la nouvelle valeur
    if (selectedValue === value) {
      onValueChange('');
    } else {
      onValueChange(selectedValue);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          dir="rtl"
          className={cn(
            'w-full h-11 justify-between border-[#e2e8f0] bg-white rounded font-normal text-start px-3 hover:bg-[#f7fafc] focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]',
            !value && 'text-gray-400',
            className
          )}
        >
          <span className="truncate flex-1 text-start">
            {value ? displayLabel : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ms-2" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        dir="rtl"
        align="start"
        className="w-[--radix-popover-trigger-width] p-0 bg-white border border-[#e2e8f0] rounded shadow-sm overflow-hidden z-50"
      >
        <Command
          dir="rtl"
          filter={(itemValue, search) => {
            if (!search) return 1;
            const normItem = itemValue.toLowerCase().trim();
            const normSearch = search.toLowerCase().trim();
            return normItem.includes(normSearch) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder={placeholder}
            className="h-10 border-none border-b border-[#e2e8f0] text-sm text-start"
          />
          <CommandList className="max-h-60 overflow-y-auto p-1">
            {isLoading ? (
              <div className="py-6 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#2c5282]" />
                <span>جاري التحميل...</span>
              </div>
            ) : (
              <>
                <CommandEmpty className="py-4 text-center text-xs text-gray-500">
                  {emptyMessage}
                </CommandEmpty>
                <CommandGroup>
                  {value && (
                    <CommandItem
                      value="__clear__"
                      onSelect={() => {
                        onValueChange('');
                        setOpen(false);
                      }}
                      className="flex items-center gap-2 cursor-pointer px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded border-b border-[#e2e8f0] mb-1"
                    >
                      <span className="flex-1 text-start">✕ إلغاء الاختيار (عرض الكل)</span>
                    </CommandItem>
                  )}
                  {uniqueOptions.map((option) => {
                    const isSelected = value === option.value;
                    return (
                      <CommandItem
                        key={option._id || option.value}
                        value={option.value}
                        onSelect={() => handleSelect(option.value)}
                        className={cn(
                          'flex items-center gap-2 cursor-pointer px-3 py-2 text-sm rounded hover:bg-[#f7fafc] transition-colors',
                          isSelected && 'bg-[#ebf4ff] text-[#2c5282] font-semibold'
                        )}
                      >
                        <Check
                          className={cn(
                            'h-4 w-4 shrink-0 text-[#2c5282]',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="truncate flex-1 text-start">
                          {option.value}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default DocumentOptionCombobox;
