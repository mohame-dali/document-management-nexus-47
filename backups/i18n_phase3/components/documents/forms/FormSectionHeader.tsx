
import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface FormSectionHeaderProps {
  title: string;
  backUrl: string;
  backText: string;
  className?: string;
}

const FormSectionHeader: React.FC<FormSectionHeaderProps> = ({
  title,
  backUrl,
  backText,
  className = ""
}) => {
  const navigate = useNavigate();

  return (
    <div className={`flex items-center justify-between mb-6 ${className}`}>
      <div className="flex items-center space-x-reverse space-x-4">
        <Button
          variant="ghost"
          onClick={() => navigate(backUrl)}
          className={`flex items-center space-x-reverse space-x-2 ${
            className.includes('text-white') 
              ? 'text-white hover:bg-white/20' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ArrowRight className="h-4 w-4" />
          <span>{backText}</span>
        </Button>
      </div>
      
      <h1 className={`text-2xl font-bold ${
        className.includes('text-white') ? 'text-white' : 'text-gray-900'
      }`}>
        {title}
      </h1>
    </div>
  );
};

export default FormSectionHeader;
