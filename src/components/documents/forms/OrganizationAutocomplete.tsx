import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Plus, X, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getDocumentOptions, DocumentOption } from '@/services/documentOptionsService';
import { getIncomingDocuments, getOutgoingDocuments } from '@/services/documentService';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';

function mergeUniqueSuggestions(lists: Array<Array<string | undefined | null>>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const list of lists) {
    for (const raw of list) {
      if (typeof raw !== 'string') continue;
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(trimmed);
    }
  }
  return result;
}

interface OrganizationAutocompleteProps {
  category: 'source' | 'typeDocument' | 'activity';
  documentType: 'incoming' | 'outgoing';
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export const OrganizationAutocomplete: React.FC<OrganizationAutocompleteProps> = ({
  category,
  documentType,
  value,
  onValueChange,
  placeholder,
  disabled = false,
  id,
}) => {
  const { t } = useLanguage();
  const { dir } = useDirection();
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: configuredOptions = [] } = useQuery<DocumentOption[]>({
    queryKey: ['documentOptions', category, documentType],
    queryFn: () => getDocumentOptions({ category, documentType }),
    staleTime: 1000 * 60 * 5,
  });

  const { data: recentSources = [] } = useQuery<string[]>({
    queryKey: ['documentSuggestionHistory', documentType, category],
    queryFn: async () => {
      if (category !== 'source' || documentType !== 'incoming') return [];
      try {
        const res = await getIncomingDocuments({ page: 1, limit: 100 });
        return (res.data || []).map((doc) => doc.source || '');
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 3,
    enabled: category === 'source' && documentType === 'incoming',
  });

  const allSuggestions = useMemo(() => {
    const optionValues = configuredOptions.map((o) => o?.value);
    return mergeUniqueSuggestions([optionValues, recentSources]);
  }, [configuredOptions, recentSources]);

  const filteredSuggestions = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q) return allSuggestions.slice(0, 30);
    return allSuggestions
      .filter((item) => item.toLowerCase().includes(q))
      .slice(0, 30);
  }, [allSuggestions, value]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [value, open]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSelect = (selected: string) => {
    onValueChange(selected);
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }

    if (e.key === 'Escape') {
      setOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    if (!open || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filteredSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev <= 0 ? filteredSuggestions.length - 1 : prev - 1
      );
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      const target = filteredSuggestions[highlightedIndex];
      if (target) {
        handleSelect(target);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full" dir={dir}>
      <div className="relative flex items-center">
        <Input
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          dir={dir}
          autoComplete="off"
          placeholder={placeholder || t('documents.forms.autocomplete.sourcePlaceholder')}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onValueChange(e.target.value);
            if (!open) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          className="pe-14 text-start"
        />
        <div className="absolute end-1.5 flex items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onValueChange('');
                setOpen(true);
              }}
              aria-label={t('common.clear', { defaultValue: 'Clear' })}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen((prev) => !prev);
            }}
            aria-label={t('documents.forms.autocomplete.suggestionsLabel')}
            className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded transition-colors"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform duration-150', open && 'rotate-180')} />
          </button>
        </div>
      </div>

      {open && !disabled && (
        <div
          dir={dir}
          role="listbox"
          className="absolute start-0 end-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-md max-h-60 overflow-y-auto py-1"
        >
          {filteredSuggestions.length > 0 ? (
            <>
              <div className="px-3 py-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 text-start">
                {t('documents.forms.autocomplete.suggestionsLabel')}
              </div>
              {filteredSuggestions.map((item, idx) => {
                const isSelected = value.trim().toLowerCase() === item.toLowerCase();
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={item}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(item);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-start transition-colors',
                      isHighlighted
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200',
                      isSelected && 'bg-blue-50/80 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-300 font-medium'
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="truncate">{item}</span>
                    </span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-[#2c5282] dark:text-blue-400" />}
                  </button>
                );
              })}
            </>
          ) : (
            <div className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400 text-start">
              {t('documents.forms.autocomplete.noMatchesFreeText')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface MultiOrganizationAutocompleteProps {
  category: 'assignedTo' | 'pourInfo';
  documentType: 'outgoing';
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const MultiOrganizationAutocomplete: React.FC<MultiOrganizationAutocompleteProps> = ({
  category,
  documentType,
  values,
  onValuesChange,
  placeholder,
  disabled = false,
}) => {
  const { t } = useLanguage();
  const { dir } = useDirection();
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: configuredOptions = [] } = useQuery<DocumentOption[]>({
    queryKey: ['documentOptions', category, documentType],
    queryFn: () => getDocumentOptions({ category, documentType }),
    staleTime: 1000 * 60 * 5,
  });

  const { data: recentRecipients = [] } = useQuery<string[]>({
    queryKey: ['documentSuggestionHistory', documentType, category],
    queryFn: async () => {
      try {
        const res = await getOutgoingDocuments({ page: 1, limit: 100 });
        const collected: string[] = [];
        for (const doc of res.data || []) {
          const list = category === 'assignedTo' ? doc.assignedTo : doc.pourInfo;
          if (Array.isArray(list)) {
            for (const entry of list) {
              if (typeof entry === 'string') collected.push(entry);
            }
          }
        }
        return collected;
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 3,
  });

  const allSuggestions = useMemo(() => {
    const optionValues = configuredOptions.map((o) => o?.value);
    return mergeUniqueSuggestions([optionValues, recentRecipients]);
  }, [configuredOptions, recentRecipients]);

  const selectedLowerSet = useMemo(
    () => new Set(values.map((v) => v.trim().toLowerCase())),
    [values]
  );

  const filteredSuggestions = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    return allSuggestions
      .filter((item) => {
        if (selectedLowerSet.has(item.toLowerCase())) return false;
        if (!q) return true;
        return item.toLowerCase().includes(q);
      })
      .slice(0, 30);
  }, [allSuggestions, selectedLowerSet, inputValue]);

  const trimmedInput = inputValue.trim();
  const canAddCustom =
    trimmedInput.length > 0 &&
    !selectedLowerSet.has(trimmedInput.toLowerCase()) &&
    !filteredSuggestions.some((s) => s.toLowerCase() === trimmedInput.toLowerCase());

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [inputValue, open]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const addValue = (rawValue: string) => {
    const clean = rawValue.trim();
    if (!clean) return;
    if (!values.some((v) => v.trim().toLowerCase() === clean.toLowerCase())) {
      onValuesChange([...values, clean]);
    }
    setInputValue('');
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const removeValue = (valueToRemove: string) => {
    onValuesChange(values.filter((v) => v !== valueToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }

    if (e.key === 'Escape') {
      setOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    if (e.key === 'ArrowDown' && filteredSuggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
      setHighlightedIndex((prev) => (prev + 1) % filteredSuggestions.length);
      return;
    }

    if (e.key === 'ArrowUp' && filteredSuggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
      setHighlightedIndex((prev) =>
        prev <= 0 ? filteredSuggestions.length - 1 : prev - 1
      );
      return;
    }

    if (e.key === 'Enter') {
      if (open && highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        e.preventDefault();
        addValue(filteredSuggestions[highlightedIndex]);
        return;
      }
      if (trimmedInput) {
        e.preventDefault();
        addValue(trimmedInput);
      }
    }
  };

  const handleContainerBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const nextTarget = e.relatedTarget as Node | null;
    if (nextTarget && containerRef.current?.contains(nextTarget)) {
      return;
    }
    if (trimmedInput) {
      addValue(trimmedInput);
    } else {
      setOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full space-y-2.5"
      dir={dir}
      onBlur={handleContainerBlur}
    >
      <div className="relative">
        <div className="relative flex items-center">
          <Input
            type="text"
            value={inputValue}
            disabled={disabled}
            dir={dir}
            autoComplete="off"
            placeholder={
              placeholder || t('documents.forms.autocomplete.destinationPlaceholder')
            }
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (!open) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            className="pe-16 text-start"
          />
          <div className="absolute end-1.5 flex items-center gap-0.5">
            {trimmedInput && !disabled && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addValue(trimmedInput);
                }}
                title={t('documents.forms.autocomplete.addCustom', { value: trimmedInput })}
                className="p-1 text-[#2c5282] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled}
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen((prev) => !prev);
              }}
              aria-label={t('documents.forms.autocomplete.suggestionsLabel')}
              className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded transition-colors"
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform duration-150', open && 'rotate-180')} />
            </button>
          </div>
        </div>

        {open && !disabled && (
          <div
            dir={dir}
            role="listbox"
            className="absolute start-0 end-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-md max-h-60 overflow-y-auto py-1"
          >
            {canAddCustom && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addValue(trimmedInput);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-start font-medium text-[#2c5282] dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100/70 dark:hover:bg-blue-900/50 border-b border-slate-100 dark:border-slate-800 transition-colors"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {t('documents.forms.autocomplete.addCustom', { value: trimmedInput })}
                </span>
              </button>
            )}

            {filteredSuggestions.length > 0 ? (
              <>
                <div className="px-3 py-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 text-start">
                  {t('documents.forms.autocomplete.suggestionsLabel')}
                </div>
                {filteredSuggestions.map((item, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <button
                      key={item}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addValue(item);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm text-start transition-colors',
                        isHighlighted
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200'
                      )}
                    >
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="truncate">{item}</span>
                    </button>
                  );
                })}
              </>
            ) : !canAddCustom ? (
              <div className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400 text-start">
                {t('documents.forms.autocomplete.noMatchesFreeText')}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700"
            >
              <span>{item}</span>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 text-slate-500 hover:text-red-600 hover:bg-transparent"
                  onClick={() => removeValue(item)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
