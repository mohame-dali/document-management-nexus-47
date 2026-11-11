
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { getDocumentOptions, DocumentOption } from '@/services/documentOptionsService';
import { Loader2, X } from 'lucide-react';

interface MultiDocumentOptionSelectProps {
  category: 'activity' | 'source' | 'typeDocument' | 'assignedTo' | 'pourInfo';
  documentType: 'incoming' | 'outgoing';
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MultiDocumentOptionSelect: React.FC<MultiDocumentOptionSelectProps> = ({
  category,
  documentType,
  values,
  onValuesChange,
  placeholder = "اختر الخيارات",
  disabled = false
}) => {
  const [selectedValue, setSelectedValue] = useState<string>('');

  const { data: options = [], isLoading } = useQuery({
    queryKey: ['documentOptions', category, documentType],
    queryFn: () => getDocumentOptions({ category, documentType }),
  });

  const handleAddValue = (value: string) => {
    if (value && !values.includes(value)) {
      onValuesChange([...values, value]);
      setSelectedValue('');
    }
  };

  const handleRemoveValue = (valueToRemove: string) => {
    onValuesChange(values.filter(v => v !== valueToRemove));
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">جاري تحميل الخيارات...</span>
      </div>
    );
  }

  const availableOptions = options.filter((option: DocumentOption) => 
    !values.includes(option.value)
  );

  return (
    <div className="space-y-3">
      <Select value={selectedValue} onValueChange={handleAddValue} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {availableOptions.map((option: DocumentOption) => (
            <SelectItem key={option._id} value={option.value}>
              {option.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((value, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {value}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleRemoveValue(value)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiDocumentOptionSelect;
