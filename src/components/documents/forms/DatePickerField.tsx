
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { formatLongDate } from '@/utils/formatDate';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useDirection } from '@/i18n/useDirection';
import { useLanguage } from '@/contexts/LanguageProvider';
import { arTN, fr } from 'date-fns/locale';

interface DatePickerFieldProps<TFieldValues extends FieldValues = FieldValues> {
  field: ControllerRenderProps<TFieldValues>;
  label: string;
  description?: string;
  selectDateText: string;
  keepSelected?: boolean;
}

const DatePickerField: React.FC<DatePickerFieldProps> = ({
  field,
  label,
  description,
  selectDateText,
  keepSelected = false
}) => {
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const { language } = useLanguage();
  const lang: 'ar' | 'fr' = language === 'ar' ? 'ar' : 'fr';

  return (
    <FormItem className="space-y-2">
      <FormLabel className="text-responsive-sm font-medium">{label}</FormLabel>
      <FormControl>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full flex justify-start text-start font-normal touch-target input-responsive",
                !field.value ? "text-muted-foreground" : "",
                "hover:bg-accent hover:text-accent-foreground transition-colors"
              )}
            >
              <Calendar className="me-2 icon-responsive" />
              <span className="flex-1 text-start tabular-nums">
                {field.value ? (
                  <bdi dir={lang === 'ar' ? 'rtl' : 'ltr'}>{formatLongDate(field.value, lang)}</bdi>
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
              onSelect={(date) => {
                if (keepSelected) {
                  field.onChange(date || field.value || new Date());
                } else {
                  field.onChange(date);
                }
              }}
              initialFocus
              locale={lang === 'ar' ? arTN : fr}
              className={cn(
                "p-3 pointer-events-auto",
                isMobile ? "scale-95" : ""
              )}
              dir={dir}
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
