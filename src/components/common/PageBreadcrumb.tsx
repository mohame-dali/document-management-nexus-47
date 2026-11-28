import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useDirection } from '@/i18n/useDirection';
import { useAuth } from '@/contexts/AuthContext';
import { getDefaultLandingRoute } from '@/utils/roleUtils';
import { cn } from '@/lib/utils';

export interface PageBreadcrumbItem {
  label: string;
  to?: string;
  tabular?: boolean;
  ltr?: boolean;
}

interface PageBreadcrumbProps {
  items: PageBreadcrumbItem[];
  showHomeIcon?: boolean;
  homeTo?: string;
  homeLabel?: string;
  className?: string;
}

export const PageBreadcrumb: React.FC<PageBreadcrumbProps> = ({
  items,
  showHomeIcon = false,
  homeTo,
  homeLabel,
  className,
}) => {
  const { isRTL } = useDirection();
  const { currentUser } = useAuth();
  const SeparatorIcon = isRTL ? ChevronLeft : ChevronRight;
  const resolvedHomeTo =
    homeTo === '/dashboard' && currentUser ? getDefaultLandingRoute(currentUser) : homeTo;

  return (
    <Breadcrumb
      className={cn('print:hidden', className)}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <BreadcrumbList className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 gap-1.5 sm:gap-2">
        {homeLabel && (
          <>
            <BreadcrumbItem>
              {resolvedHomeTo ? (
                <BreadcrumbLink asChild>
                  <Link
                    to={resolvedHomeTo}
                    className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300 hover:text-[#2c5282] dark:hover:text-blue-300 transition-colors"
                  >
                    {showHomeIcon && <Home className="h-3.5 w-3.5 shrink-0" />}
                    <span>{homeLabel}</span>
                  </Link>
                </BreadcrumbLink>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                  {showHomeIcon && <Home className="h-3.5 w-3.5 shrink-0" />}
                  <span>{homeLabel}</span>
                </span>
              )}
            </BreadcrumbItem>
            {items.length > 0 && (
              <BreadcrumbSeparator className="text-slate-400 dark:text-slate-500">
                <SeparatorIcon className="h-3.5 w-3.5" />
              </BreadcrumbSeparator>
            )}
          </>
        )}

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const content = item.ltr ? (
            <bdi dir="ltr">{item.label}</bdi>
          ) : (
            item.label
          );

          return (
            <React.Fragment key={`${item.label}-${idx}`}>
              <BreadcrumbItem className="min-w-0">
                {!isLast && item.to ? (
                  <BreadcrumbLink asChild>
                    <Link
                      to={item.to}
                      className={cn(
                        'font-medium text-slate-600 dark:text-slate-300 hover:text-[#2c5282] dark:hover:text-blue-300 transition-colors truncate max-w-[200px] sm:max-w-xs',
                        item.tabular && 'tabular-nums font-semibold'
                      )}
                    >
                      {content}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage
                    className={cn(
                      'font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[220px] sm:max-w-md',
                      item.tabular && 'tabular-nums font-bold'
                    )}
                  >
                    {content}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>

              {!isLast && (
                <BreadcrumbSeparator className="text-slate-400 dark:text-slate-500">
                  <SeparatorIcon className="h-3.5 w-3.5" />
                </BreadcrumbSeparator>
              )}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default PageBreadcrumb;
