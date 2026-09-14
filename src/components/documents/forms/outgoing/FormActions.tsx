
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';

interface FormActionsProps {
  form: UseFormReturn<any>;
  onSubmit: (data: any) => Promise<void>;
  cancelText: string;
  submitText: string;
  cancelRoute: string;
}

const FormActions: React.FC<FormActionsProps> = ({
  form,
  onSubmit,
  cancelText,
  submitText,
  cancelRoute
}) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex justify-between">
      <Button 
        variant="outline" 
        onClick={() => navigate(cancelRoute)}
      >
        {cancelText}
      </Button>
      <Button 
        onClick={form.handleSubmit(onSubmit)}
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
