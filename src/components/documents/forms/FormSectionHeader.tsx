import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface FormSectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  backUrl: string;
  backText: string;
  className?: string;
}

const FormSectionHeader: React.FC<FormSectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  backUrl,
  backText,
  className = '',
}) => {
  const navigate = useNavigate();

  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3.5 min-w-0">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 leading-snug">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => navigate(backUrl)}
        className="ms-auto shrink-0 h-9 px-3.5 gap-1.5 border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
      >
        <ArrowRight className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
        <span>{backText}</span>
      </Button>
    </div>
  );
};

export default FormSectionHeader;

