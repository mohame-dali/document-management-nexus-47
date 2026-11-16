import React, { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { getDocumentOptions, DocumentOption } from '@/services/documentOptionsService';
import { Loader2 } from 'lucide-react';

interface DocumentOptionSelectProps {
  category: 'activity' | 'source' | 'typeDocument' | 'assignedTo' | 'pourInfo';
  documentType: 'incoming' | 'outgoing';
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
}

const DocumentOptionSelect: React.FC<DocumentOptionSelectProps> = ({
  category,
  documentType,
  value,
  onValueChange,
  placeholder = 'Select an option',
  disabled = false,
  allowCustom = false,
}) => {
  const { data: options = [], isLoading } = useQuery({
    queryKey: ['documentOptions', category, documentType],
    queryFn: () => getDocumentOptions({ category, documentType }),
  });

  // Deduplicate options sharing identical _id or value (e.g., an option created both for
  // documentType='incoming' and documentType='both' matching the backend $or filter).
  const uniqueOptions = useMemo(() => {
    const seenIds = new Set<string>();
    const seenValues = new Set<string>();
    const result: DocumentOption[] = [];

    for (const option of options) {
      if (!option || typeof option.value !== 'string') continue;
      const optId = option._id ? String(option._id) : '';
      const normalizedValue = option.value.trim();
      if (!normalizedValue) continue;
      if (optId && seenIds.has(optId)) continue;
      if (seenValues.has(normalizedValue)) continue;

      if (optId) seenIds.add(optId);
      seenValues.add(normalizedValue);
      result.push(option);
    }

    return result;
  }, [options]);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading options...</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {uniqueOptions.map((option: DocumentOption, index: number) => {
          const itemKey = option._id
            ? String(option._id)
            : `${option.category || category}-${option.documentType || documentType}-${index}`;
          return (
            <SelectItem key={itemKey} value={option.value}>
              {option.value}
            </SelectItem>
          );
        })}
        {allowCustom && (
          <SelectItem key="__custom__" value="__custom__">
            + Add custom value
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};

export default DocumentOptionSelect;
