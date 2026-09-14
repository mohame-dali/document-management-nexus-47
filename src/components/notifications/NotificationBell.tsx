
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
            title={notificationCount > 0 ? `${notificationCount} إشعارات نشاط جديدة` : 'عرض الإشعارات'}
            className="hover:bg-white/20 text-white relative"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-xs text-white font-bold">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              </div>
            )}
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" sideOffset={5}>
        <ActivityNotifications />
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
