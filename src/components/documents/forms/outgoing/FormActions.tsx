
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { UseFormReturn, FieldValues, SubmitHandler } from 'react-hook-form';

interface FormActionsProps<TFieldValues extends FieldValues = FieldValues> {
  form: UseFormReturn<TFieldValues>;
  onSubmit: SubmitHandler<TFieldValues>;
  cancelText: string;
  submitText: string;
  cancelRoute: string;
  disabled?: boolean;
}

const FormActions: React.FC<FormActionsProps> = ({
  form,
  onSubmit,
  cancelText,
  submitText,
  cancelRoute,
  disabled = false,
}) => {
  const navigate = useNavigate();
  const isDisabled = disabled || form.formState.isSubmitting;
  
  return (
    <div className="w-full flex items-center justify-between gap-3">
      <Button 
        type="button"
        variant="outline" 
        onClick={() => navigate(cancelRoute)}
        className="h-10 px-5 font-medium border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        {cancelText}
      </Button>
      <Button 
        type="button"
        onClick={form.handleSubmit(onSubmit)}
        disabled={isDisabled}
        className="h-10 px-6 font-semibold bg-[#2c5282] hover:bg-[#234269] text-white shadow-sm"
      >
        {form.formState.isSubmitting ? (
          <>
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
            {submitText}
          </>
        ) : (
          submitText
        )}
      </Button>
    </div>
  );
};

export default FormActions;
