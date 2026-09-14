
import React from 'react';
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ControllerRenderProps } from 'react-hook-form';
import { Department } from '@/types';

interface DepartmentSelectFieldProps {
  field: ControllerRenderProps<any, any>;
  label: string;
  description?: string;
  departments: Department[];
  placeholder: string;
}

const DepartmentSelectField: React.FC<DepartmentSelectFieldProps> = ({
  field,
  label,
  description,
  departments,
  placeholder
}) => {
  // Filter only active departments
  const activeDepartments = departments.filter(dept => dept.isActive);

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <Select
        onValueChange={(value) => field.onChange([value])}
        value={field.value?.[0] || ""}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {activeDepartments.map(dept => (
            <SelectItem key={dept._id} value={dept._id}>
              {dept.name}
              {dept.description && (
                <span className="text-xs text-muted-foreground block">
                  {dept.description}
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
};

export default DepartmentSelectField;
