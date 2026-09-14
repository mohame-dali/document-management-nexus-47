
import React from 'react';
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ControllerRenderProps } from 'react-hook-form';
import { Department } from '@/types';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiDepartmentSelectFieldProps {
  field: ControllerRenderProps<any, any>;
  label: string;
  description?: string;
  departments: Department[];
  placeholder: string;
}

const MultiDepartmentSelectField: React.FC<MultiDepartmentSelectFieldProps> = ({
  field,
  label,
  description,
  departments,
  placeholder
}) => {
  const [open, setOpen] = React.useState(false);
  
  // Filter only active departments
  const activeDepartments = departments.filter(dept => dept.isActive);
  
  // Get selected departments
  const selectedDepartmentIds = field.value || [];
  const selectedDepartments = activeDepartments.filter(dept => 
    selectedDepartmentIds.includes(dept._id)
  );

  const handleSelect = (departmentId: string) => {
    const currentIds = field.value || [];
    let newIds;
    
    if (currentIds.includes(departmentId)) {
      // Remove department if already selected
      newIds = currentIds.filter((id: string) => id !== departmentId);
    } else {
      // Add department if not selected
      newIds = [...currentIds, departmentId];
    }
    
    field.onChange(newIds);
  };

  const handleRemove = (departmentId: string) => {
    const currentIds = field.value || [];
    const newIds = currentIds.filter((id: string) => id !== departmentId);
    field.onChange(newIds);
  };

  const selectAllDepartments = () => {
    const allIds = activeDepartments.map(dept => dept._id);
    field.onChange(allIds);
  };

  const clearAll = () => {
    field.onChange([]);
  };

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      
      {/* Selected departments display */}
      {selectedDepartments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedDepartments.map(dept => (
            <Badge 
              key={dept._id} 
              variant="secondary" 
              className="flex items-center gap-1 pr-1"
            >
              {dept.name}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleRemove(dept._id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedDepartments.length === 0 
                ? placeholder 
                : `${selectedDepartments.length} قسم محدد`
              }
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="البحث في الأقسام..." />
            <CommandList>
              <CommandEmpty>لا توجد أقسام.</CommandEmpty>
              <CommandGroup>
                {/* Select All / Clear All buttons */}
                <div className="flex gap-2 p-2 border-b">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllDepartments}
                    className="flex-1"
                  >
                    تحديد الكل
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAll}
                    className="flex-1"
                  >
                    إلغاء التحديد
                  </Button>
                </div>
                
                {activeDepartments.map(dept => {
                  const isSelected = selectedDepartmentIds.includes(dept._id);
                  return (
                    <CommandItem
                      key={dept._id}
                      value={dept.name}
                      onSelect={() => handleSelect(dept._id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{dept.name}</span>
                        {dept.description && (
                          <span className="text-xs text-muted-foreground">
                            {dept.description}
                          </span>
                        )}
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
};

export default MultiDepartmentSelectField;
