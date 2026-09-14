
import React from 'react';
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
  placeholder = "Select an option",
  disabled = false,
  allowCustom = false
}) => {
  const { data: options = [], isLoading } = useQuery({
    queryKey: ['documentOptions', category, documentType],
    queryFn: () => getDocumentOptions({ category, documentType }),
  });

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
        {options.map((option: DocumentOption) => (
          <SelectItem key={option._id} value={option.value}>
            {option.value}
          </SelectItem>
        ))}
        {allowCustom && (
          <SelectItem value="__custom__">
            + Add custom value
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};

export default DocumentOptionSelect;
