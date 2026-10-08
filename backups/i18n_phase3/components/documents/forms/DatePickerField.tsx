
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { ControllerRenderProps } from 'react-hook-form';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface DatePickerFieldProps {
  field: ControllerRenderProps<any, any>;
  label: string;
  description?: string;
  selectDateText: string;
}

const DatePickerField: React.FC<DatePickerFieldProps> = ({
  field,
  label,
  description,
  selectDateText
}) => {
  const isMobile = useIsMobile();

  return (
    <FormItem className="space-y-2">
      <FormLabel className="text-responsive-sm font-medium">{label}</FormLabel>
      <FormControl>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full flex justify-start text-right font-normal touch-target input-responsive",
                !field.value ? "text-muted-foreground" : "",
                "hover:bg-accent hover:text-accent-foreground transition-colors"
              )}
            >
              <Calendar className="ml-2 icon-responsive" />
              <span className="flex-1 text-right">
                {field.value ? (
                  formatArabicDate(field.value)
                ) : (
                  <span className="text-muted-foreground">{selectDateText}</span>
                )}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className={cn(
              "w-auto p-0 z-50",
              isMobile ? "dialog-responsive-sm" : ""
            )} 
            align="start"
            side={isMobile ? "bottom" : "bottom"}
          >
            <CalendarComponent
              mode="single"
              selected={field.value}
              onSelect={(date) => field.onChange(date)}
              initialFocus
              className={cn(
                "p-3 pointer-events-auto",
                isMobile ? "scale-95" : ""
              )}
              dir="rtl"
            />
          </PopoverContent>
        </Popover>
      </FormControl>
      {description && (
        <FormDescription className="text-responsive-xs text-muted-foreground">
          {description}
        </FormDescription>
      )}
      <FormMessage className="text-responsive-xs" />
    </FormItem>
  );
};

export default DatePickerField;
