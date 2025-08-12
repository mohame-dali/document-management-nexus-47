import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
  MessageCircle, 
  ChevronLeft,
  Database,
  Shield
} from 'lucide-react';

const SettingsPage = () => {
  const navigate = useNavigate();

  const settingsOptions = [
    {
      title: 'إدارة الرسائل',
      description: 'إعدادات حذف وأرشفة الرسائل',
      icon: MessageCircle,
      path: '/dashboard/settings/message-retention',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    // Future settings can be added here
    {
      title: 'النسخ الاحتياطي',
      description: 'إعدادات النسخ الاحتياطي للبيانات',
      icon: Database,
      path: '/dashboard/settings/backup',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'الأمان والخصوصية',
      description: 'إعدادات الأمان وحماية البيانات',
      icon: Shield,
      path: '/dashboard/settings/security-privacy',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      disabled: false
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">الإعدادات</h1>
          <p className="text-muted-foreground">إدارة إعدادات النظام</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsOptions.map((option, index) => (
          <Card 
            key={index} 
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 transition-colors">
                <option.icon className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">{option.title}</CardTitle>
              <CardDescription className="text-sm">{option.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full justify-between"
                onClick={() => navigate(option.path)}
              >
                'الذهاب'
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SettingsPage;