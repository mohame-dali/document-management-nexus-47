
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getNotificationCount } from '@/services/activityNotificationService';
import ActivityNotifications from './ActivityNotifications';

const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { data: notificationCount = 0 } = useQuery({
    queryKey: ['activityNotificationCount'],
    queryFn: getNotificationCount,
    refetchInterval: 10000, // Refetch every 10 seconds for more responsive updates
    staleTime: 0,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            title="إشعارات النظام"
            aria-label="إشعارات النظام"
            className="p-2.5 min-w-[44px] min-h-[44px] text-[#2c5282] hover:bg-[#f7fafc] rounded relative transition-colors duration-200 flex items-center justify-center"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <div className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white px-1 leading-none">
                <span>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              </div>
            )}
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 sm:w-96 p-0 bg-white border border-[#e2e8f0] rounded shadow-sm" 
        align="end" 
        sideOffset={5}
        dir="rtl"
      >
        <ActivityNotifications />
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
