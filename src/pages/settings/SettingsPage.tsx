import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { uploadUserPhoto } from '@/services/userService';
import { updatePassword } from '@/services/authService';
import { backupService, BackupStats } from '@/services/backupService';
import { getRetentionPolicy, getMessagesStats, RetentionPolicy, MessagesStats } from '@/services/messageSettingsService';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  Settings,
  User,
  Shield,
  Bell,
  Sliders,
  Database,
  MessageCircle,
  Lock,
  Camera,
  Save,
  RefreshCw,
  ChevronLeft,
  ExternalLink,
  HardDrive,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Key,
  LogOut,
  Laptop,
  Smartphone,
  Eye,
  EyeOff,
  Check,
  Building2
} from 'lucide-react';
import { useSetupStatus } from '@/hooks/useSetupStatus';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { isSetupComplete, settings: orgSettings } = useSetupStatus();

  // Active tab state
  const [activeTab, setActiveTab] = useState('profile');

  // Profile states
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Security states
  const [sessionTimeout, setSessionTimeout] = useState(() => localStorage.getItem('app_session_timeout') || '30');
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(() => localStorage.getItem('app_max_login_attempts') || '5');
  const [twoFactorAuth, setTwoFactorAuth] = useState(() => localStorage.getItem('app_2fa_enabled') === 'true');
  const [auditLogging, setAuditLogging] = useState(() => localStorage.getItem('app_audit_logging') !== 'false');
  const [requireStrongPassword, setRequireStrongPassword] = useState(() => localStorage.getItem('app_strong_pwd') !== 'false');
  const [isTerminateSessionsOpen, setIsTerminateSessionsOpen] = useState(false);

  // Notification states
  const [emailNotifications, setEmailNotifications] = useState(() => localStorage.getItem('pref_email_notif') !== 'false');
  const [instantAlerts, setInstantAlerts] = useState(() => localStorage.getItem('pref_instant_alerts') !== 'false');
  const [deadlineReminders, setDeadlineReminders] = useState(() => localStorage.getItem('pref_deadline_alerts') !== 'false');
  const [soundAlerts, setSoundAlerts] = useState(() => localStorage.getItem('pref_sound_alerts') === 'true');
  const [dailyDigest, setDailyDigest] = useState(() => localStorage.getItem('pref_daily_digest') === 'true');

  // System & Display preferences
  const [tableDensity, setTableDensity] = useState(() => localStorage.getItem('pref_table_density') || 'comfortable');
  const [itemsPerPage, setItemsPerPage] = useState(() => localStorage.getItem('pref_items_per_page') || '25');
  const [defaultSortOrder, setDefaultSortOrder] = useState(() => localStorage.getItem('pref_sort_order') || 'desc');
  const [autoOpenPdf, setAutoOpenPdf] = useState(() => localStorage.getItem('pref_auto_open_pdf') !== 'false');

  // Backup & Retention overview states
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null);
  const [retentionPolicy, setRetentionPolicy] = useState<RetentionPolicy | null>(null);
  const [messagesStats, setMessagesStats] = useState<MessagesStats | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Load overview data for the backup & retention tabs
  useEffect(() => {
    const loadOverviewData = async () => {
      try {
        setLoadingOverview(true);
        const [bStats, rPolicy, mStats] = await Promise.allSettled([
          backupService.getBackupStats(),
          getRetentionPolicy(),
          getMessagesStats()
        ]);
        if (bStats.status === 'fulfilled') setBackupStats(bStats.value);
        if (rPolicy.status === 'fulfilled') setRetentionPolicy(rPolicy.value);
        if (mStats.status === 'fulfilled') setMessagesStats(mStats.value);
      } catch (err) {
        console.error('Error fetching settings overview data:', err);
      } finally {
        setLoadingOverview(false);
      }
    };
    loadOverviewData();
  }, []);

  // Photo upload mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: (file: File) => {
      if (!currentUser?._id) throw new Error('لا يوجد مستخدم مسجل');
      return uploadUserPhoto(currentUser._id, file);
    },
    onSuccess: () => {
      toast.success('تم تحديث الصورة الشخصية بنجاح');
      setSelectedPhoto(null);
      setPhotoPreview(null);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: (err: unknown) => {
      const errorMsg = err && typeof err === 'object' && 'response' in err && (err as any).response?.data?.error 
        ? (err as any).response.data.error 
        : 'فشل في تحديث الصورة الشخصية';
      toast.error(errorMsg);
    }
  });

  // Password update mutation
  const updatePasswordMutation = useMutation({
    mutationFn: () => updatePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('تم تحديث كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordModalOpen(false);
    },
    onError: (err: unknown) => {
      const errorMsg = err && typeof err === 'object' && 'response' in err && (err as any).response?.data?.error 
        ? (err as any).response.data.error 
        : 'فشل في تغيير كلمة المرور';
      toast.error(errorMsg);
    }
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('حجم الصورة يجب أن لا يتجاوز 5 ميغابايت');
        return;
      }
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSavePhoto = () => {
    if (selectedPhoto) {
      uploadPhotoMutation.mutate(selectedPhoto);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('يرجى إدخال كلمة المرور الحالية');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('كلمة المرور الجديدة غير متطابقة مع تأكيد كلمة المرور');
      return;
    }
    updatePasswordMutation.mutate();
  };

  const handleSaveSecuritySettings = () => {
    localStorage.setItem('app_session_timeout', sessionTimeout);
    localStorage.setItem('app_max_login_attempts', maxLoginAttempts);
    localStorage.setItem('app_2fa_enabled', String(twoFactorAuth));
    localStorage.setItem('app_audit_logging', String(auditLogging));
    localStorage.setItem('app_strong_pwd', String(requireStrongPassword));
    toast.success('تم حفظ إعدادات الأمان بنجاح');
  };

  const handleSaveNotificationPreferences = () => {
    localStorage.setItem('pref_email_notif', String(emailNotifications));
    localStorage.setItem('pref_instant_alerts', String(instantAlerts));
    localStorage.setItem('pref_deadline_alerts', String(deadlineReminders));
    localStorage.setItem('pref_sound_alerts', String(soundAlerts));
    localStorage.setItem('pref_daily_digest', String(dailyDigest));
    toast.success('تم حفظ تفضيلات الإشعارات والتنبيهات بنجاح');
  };

  const handleSaveDisplayPreferences = () => {
    localStorage.setItem('pref_table_density', tableDensity);
    localStorage.setItem('pref_items_per_page', itemsPerPage);
    localStorage.setItem('pref_sort_order', defaultSortOrder);
    localStorage.setItem('pref_auto_open_pdf', String(autoOpenPdf));
    toast.success('تم حفظ تفضيلات العرض والنظام بنجاح');
  };

  const handleTerminateAllOtherSessions = () => {
    setIsTerminateSessionsOpen(false);
    toast.success('تم إنهاء جميع الجلسات النشطة الأخرى بنجاح');
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6" dir="rtl">
      {/* 1. Header Section - Clean Institutional AdminLTE */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded bg-[#2c5282]/10 border border-[#2c5282]/20 flex items-center justify-center text-[#2c5282] shrink-0">
            <Settings className="h-7 w-7 text-[#2c5282]" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a202c]">
                إعدادات المنظومة
              </h1>
              <span className="inline-flex items-center px-3 py-1 rounded text-sm font-bold bg-[#FFCB56] text-[#1a202c]">
                الإعدادات العامة
              </span>
            </div>
            <p className="text-base text-[#4a5568] mt-1 leading-relaxed">
              إدارة إعدادات الحساب، معايير الأمان، قنوات الإشعارات والنسخ الاحتياطي للوثائق
            </p>
          </div>
        </div>

        {/* Quick Nav Badges & Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/settings/backup')}
            className="h-11 px-4 text-base font-semibold border-[#cbd5e1] text-[#2c5282] hover:bg-blue-50 rounded gap-2"
          >
            <Database className="h-5 w-5 text-[#2c5282]" />
            <span>النسخ الاحتياطي</span>
            <ExternalLink className="h-4 w-4 opacity-70" />
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/settings/message-retention')}
            className="h-11 px-4 text-base font-semibold border-[#cbd5e1] text-[#2c5282] hover:bg-blue-50 rounded gap-2"
          >
            <MessageCircle className="h-5 w-5 text-[#2c5282]" />
            <span>إدارة الرسائل</span>
            <ExternalLink className="h-4 w-4 opacity-70" />
          </Button>
        </div>
      </div>

      {/* 2. Main Tab Navigation & Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="w-full flex flex-wrap h-auto p-1.5 bg-[#edf2f7] border border-[#e2e8f0] rounded gap-1.5">
          <TabsTrigger
            value="profile"
            className="flex-1 min-w-[140px] py-3 text-base font-semibold rounded data-[state=active]:bg-white data-[state=active]:text-[#2c5282] data-[state=active]:shadow-sm text-[#4a5568] flex items-center justify-center gap-2"
          >
            <User className="h-5 w-5" />
            <span>الملف الشخصي</span>
          </TabsTrigger>

          <TabsTrigger
            value="security"
            className="flex-1 min-w-[140px] py-3 text-base font-semibold rounded data-[state=active]:bg-white data-[state=active]:text-[#2c5282] data-[state=active]:shadow-sm text-[#4a5568] flex items-center justify-center gap-2"
          >
            <Shield className="h-5 w-5" />
            <span>الأمان والخصوصية</span>
          </TabsTrigger>

          <TabsTrigger
            value="notifications"
            className="flex-1 min-w-[140px] py-3 text-base font-semibold rounded data-[state=active]:bg-white data-[state=active]:text-[#2c5282] data-[state=active]:shadow-sm text-[#4a5568] flex items-center justify-center gap-2"
          >
            <Bell className="h-5 w-5" />
            <span>الإشعارات</span>
          </TabsTrigger>

          <TabsTrigger
            value="preferences"
            className="flex-1 min-w-[140px] py-3 text-base font-semibold rounded data-[state=active]:bg-white data-[state=active]:text-[#2c5282] data-[state=active]:shadow-sm text-[#4a5568] flex items-center justify-center gap-2"
          >
            <Sliders className="h-5 w-5" />
            <span>تفضيلات النظام</span>
          </TabsTrigger>

          <TabsTrigger
            value="backup"
            className="flex-1 min-w-[140px] py-3 text-base font-semibold rounded data-[state=active]:bg-white data-[state=active]:text-[#2c5282] data-[state=active]:shadow-sm text-[#4a5568] flex items-center justify-center gap-2"
          >
            <Database className="h-5 w-5" />
            <span>النسخ الاحتياطي</span>
          </TabsTrigger>

          <TabsTrigger
            value="retention"
            className="flex-1 min-w-[140px] py-3 text-base font-semibold rounded data-[state=active]:bg-white data-[state=active]:text-[#2c5282] data-[state=active]:shadow-sm text-[#4a5568] flex items-center justify-center gap-2"
          >
            <MessageCircle className="h-5 w-5" />
            <span>حفظ الرسائل</span>
          </TabsTrigger>

          {(currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin') && (
            <TabsTrigger
              value="organization"
              className="flex-1 min-w-[140px] py-3 text-base font-semibold rounded data-[state=active]:bg-white data-[state=active]:text-[#2c5282] data-[state=active]:shadow-sm text-[#4a5568] flex items-center justify-center gap-2"
            >
              <Building2 className="h-5 w-5" />
              <span>هوية المؤسسة</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* ========================================================= */}
        {/* TAB 1: Profile & Account Settings                         */}
        {/* ========================================================= */}
        <TabsContent value="profile" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Photo & Basic Role Card */}
            <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
              <CardHeader className="p-6 border-b border-[#e2e8f0]">
                <CardTitle className="text-xl font-bold text-[#1a202c] flex items-center gap-2 border-r-4 border-[#2c5282] pr-3">
                  <Camera className="h-5 w-5 text-[#2c5282]" />
                  <span>الصورة الشخصية</span>
                </CardTitle>
                <CardDescription className="text-base text-[#718096]">
                  صورتك تظهر في التوقيعات وسجلات العمليات
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <Avatar className="h-28 w-28 border-2 border-[#2c5282] shadow-sm">
                  <AvatarImage
                    src={photoPreview || (currentUser?.photo ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${currentUser.photo}` : undefined)}
                    alt={currentUser?.username}
                  />
                  <AvatarFallback className="bg-[#2c5282] text-white text-2xl font-bold">
                    {currentUser?.username ? currentUser.username.slice(0, 2).toUpperCase() : 'US'}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h3 className="text-xl font-bold text-[#1a202c]">{currentUser?.username || 'المستخدم'}</h3>
                  <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                    <span className="inline-flex items-center px-3 py-1 rounded text-sm font-semibold bg-[#2c5282] text-white">
                      {currentUser?.role || 'Admin'}
                    </span>
                    {currentUser?.activeDepartment && (
                      <span className="inline-flex items-center px-3 py-1 rounded text-sm font-bold bg-[#FFCB56] text-[#1a202c]">
                        {currentUser.activeDepartment.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full pt-4 border-t border-[#e2e8f0] space-y-3">
                  <input
                    type="file"
                    id="user-photo-input"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('user-photo-input')?.click()}
                    className="w-full h-11 text-base font-semibold border-[#cbd5e1] text-[#2d3748] hover:bg-gray-50 rounded"
                  >
                    <Camera className="h-5 w-5 ml-2 text-[#2c5282]" />
                    اختيار صورة جديدة
                  </Button>

                  {selectedPhoto && (
                    <Button
                      type="button"
                      onClick={handleSavePhoto}
                      disabled={uploadPhotoMutation.isPending}
                      className="w-full h-11 text-base font-bold bg-[#FFCB56] hover:bg-[#FFD758] text-[#1a202c] rounded shadow-none"
                    >
                      {uploadPhotoMutation.isPending ? 'جاري التحميل...' : 'حفظ الصورة الجديدة'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Profile Information Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
                <CardHeader className="p-6 border-b border-[#e2e8f0]">
                  <CardTitle className="text-xl font-bold text-[#1a202c] flex items-center gap-2 border-r-4 border-[#2c5282] pr-3">
                    <User className="h-5 w-5 text-[#2c5282]" />
                    <span>بيانات الحساب</span>
                  </CardTitle>
                  <CardDescription className="text-base text-[#718096]">
                    المعلومات الإدارية المسجلة لحسابك في المنظومة
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="account-username" className="text-base font-bold text-[#1a202c]">
                        اسم المستخدم
                      </Label>
                      <Input
                        id="account-username"
                        value={currentUser?.username || ''}
                        disabled
                        className="h-11 text-base bg-gray-50 border-[#cbd5e1] rounded text-gray-700 font-medium"
                      />
                      <p className="text-sm text-gray-500">اسم الدخول المسجل في النظام</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="account-role" className="text-base font-bold text-[#1a202c]">
                        الدور والصلاحية
                      </Label>
                      <Input
                        id="account-role"
                        value={currentUser?.role || ''}
                        disabled
                        className="h-11 text-base bg-gray-50 border-[#cbd5e1] rounded text-gray-700 font-medium"
                      />
                      <p className="text-sm text-gray-500">مستوى الصلاحيات المعطى للحساب</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="account-department" className="text-base font-bold text-[#1a202c]">
                        القسم الحالي النشط
                      </Label>
                      <Input
                        id="account-department"
                        value={currentUser?.activeDepartment?.name || 'غير محدد'}
                        disabled
                        className="h-11 text-base bg-gray-50 border-[#cbd5e1] rounded text-gray-700 font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="account-created" className="text-base font-bold text-[#1a202c]">
                        تاريخ إنشاء الحساب
                      </Label>
                      <Input
                        id="account-created"
                        value={currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('ar') : 'غير متوفر'}
                        disabled
                        className="h-11 text-base bg-gray-50 border-[#cbd5e1] rounded text-gray-700 font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#e2e8f0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-base font-bold text-[#1a202c]">كلمة المرور والأمان</h4>
                      <p className="text-sm text-[#4a5568]">
                        ينصح بتغيير كلمة المرور دورياً كل 90 يوماً للحفاظ على سرية النظام
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={() => setIsPasswordModalOpen(true)}
                      className="h-11 px-6 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded shrink-0 shadow-none"
                    >
                      <Key className="h-5 w-5 ml-2" />
                      تغيير كلمة المرور
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 2: Security & Privacy Settings                        */}
        {/* ========================================================= */}
        <TabsContent value="security" className="space-y-6 mt-0">
          <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
            <CardHeader className="p-6 border-b border-[#e2e8f0]">
              <CardTitle className="text-xl font-bold text-[#1a202c] flex items-center gap-2 border-r-4 border-[#2c5282] pr-3">
                <Shield className="h-5 w-5 text-[#2c5282]" />
                <span>سياسات الأمان والحماية</span>
              </CardTitle>
              <CardDescription className="text-base text-[#718096]">
                تكوين معايير الجلسات وحماية الدخول ضد المحاولات المشبوهة
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Row 1: Session & Attempt Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="session-timeout" className="text-base font-bold text-[#1a202c]">
                    مهلة انتهاء الجلسة عند عدم النشاط
                  </Label>
                  <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                    <SelectTrigger id="session-timeout" className="h-11 text-base border-[#cbd5e1] rounded bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 دقيقة</SelectItem>
                      <SelectItem value="30">30 دقيقة (موصى به)</SelectItem>
                      <SelectItem value="60">ساعة واحدة</SelectItem>
                      <SelectItem value="120">ساعتان</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">يتم قفل الشاشة تلقائياً بعد مرور هذه المدة دون نشاط</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-login-attempts" className="text-base font-bold text-[#1a202c]">
                    الحد الأقصى لمحاولات الدخول الخاطئة
                  </Label>
                  <Select value={maxLoginAttempts} onValueChange={setMaxLoginAttempts}>
                    <SelectTrigger id="max-login-attempts" className="h-11 text-base border-[#cbd5e1] rounded bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 محاولات</SelectItem>
                      <SelectItem value="5">5 محاولات (قياسي)</SelectItem>
                      <SelectItem value="10">10 محاولات</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">يتم تعليق الحساب مؤقتاً عند تجاوز هذا العدد</p>
                </div>
              </div>

              <Separator className="bg-[#e2e8f0]" />

              {/* Switches */}
              <div className="space-y-5">
                <div className="flex items-center justify-between p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded">
                  <div className="space-y-1">
                    <Label htmlFor="require-strong-pwd" className="text-base font-bold text-[#1a202c] cursor-pointer">
                      فرض كلمات مرور قوية ومعقدة
                    </Label>
                    <p className="text-sm text-[#4a5568]">
                      إلزام المستخدمين بكلمات مرور تحتوي على حروف كبيرة وصغيرة وأرقام ورموز
                    </p>
                  </div>
                  <Switch
                    id="require-strong-pwd"
                    checked={requireStrongPassword}
                    onCheckedChange={setRequireStrongPassword}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded">
                  <div className="space-y-1">
                    <Label htmlFor="audit-logging" className="text-base font-bold text-[#1a202c] cursor-pointer">
                      سجل المراقبة والتدقيق الأمني
                    </Label>
                    <p className="text-sm text-[#4a5568]">
                      تسجيل كافة عمليات الدخول وتعديلات الوثائق في سجل التدقيق للنظام
                    </p>
                  </div>
                  <Switch
                    id="audit-logging"
                    checked={auditLogging}
                    onCheckedChange={setAuditLogging}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded">
                  <div className="space-y-1">
                    <Label htmlFor="2fa-toggle" className="text-base font-bold text-[#1a202c] cursor-pointer">
                      التحقق بخطوتين (2FA)
                    </Label>
                    <p className="text-sm text-[#4a5568]">
                      طلب رمز تحقق إضافي عبر التطبيق أو البريد عند الدخول من جهاز جديد
                    </p>
                  </div>
                  <Switch
                    id="2fa-toggle"
                    checked={twoFactorAuth}
                    onCheckedChange={setTwoFactorAuth}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTerminateSessionsOpen(true)}
                  className="h-11 px-6 text-base font-semibold border-red-200 text-red-700 hover:bg-red-50 rounded"
                >
                  <LogOut className="h-5 w-5 ml-2 text-red-600" />
                  إنهاء جميع الجلسات النشطة الأخرى
                </Button>

                <Button
                  type="button"
                  onClick={handleSaveSecuritySettings}
                  className="h-11 px-8 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded shadow-none"
                >
                  <Save className="h-5 w-5 ml-2" />
                  حفظ إعدادات الأمان
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 3: Notifications & Alerts                             */}
        {/* ========================================================= */}
        <TabsContent value="notifications" className="space-y-6 mt-0">
          <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
            <CardHeader className="p-6 border-b border-[#e2e8f0]">
              <CardTitle className="text-xl font-bold text-[#1a202c] flex items-center gap-2 border-r-4 border-[#2c5282] pr-3">
                <Bell className="h-5 w-5 text-[#2c5282]" />
                <span>قنوات وتفضيلات التنبيهات</span>
              </CardTitle>
              <CardDescription className="text-base text-[#718096]">
                تخصيص الإشعارات الفورية والتنبيهات البريدية للأحداث الهامة
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded">
                  <div className="space-y-1">
                    <Label htmlFor="instant-alerts" className="text-base font-bold text-[#1a202c] cursor-pointer">
                      إشعارات فورية على الشاشة
                    </Label>
                    <p className="text-sm text-[#4a5568]">
                      إظهار إشعارات منبثقة عند استلام معاملات أو توجيهات جديدة
                    </p>
                  </div>
                  <Switch
                    id="instant-alerts"
                    checked={instantAlerts}
                    onCheckedChange={setInstantAlerts}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded">
                  <div className="space-y-1">
                    <Label htmlFor="deadline-reminders" className="text-base font-bold text-[#1a202c] cursor-pointer">
                      تنبيهات مواعيد المعالجة والتأخيرات
                    </Label>
                    <p className="text-sm text-[#4a5568]">
                      تنبيه عند اقتراب المهلة المحددة للرد على المعاملات الواردة
                    </p>
                  </div>
                  <Switch
                    id="deadline-reminders"
                    checked={deadlineReminders}
                    onCheckedChange={setDeadlineReminders}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded">
                  <div className="space-y-1">
                    <Label htmlFor="email-notifications" className="text-base font-bold text-[#1a202c] cursor-pointer">
                      إشعارات البريد الإلكتروني
                    </Label>
                    <p className="text-sm text-[#4a5568]">
                      إرسال رسالة بريد إلكتروني عند إسناد وثيقة أو إحالتها إلى قسمك
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded">
                  <div className="space-y-1">
                    <Label htmlFor="sound-alerts" className="text-base font-bold text-[#1a202c] cursor-pointer">
                      التنبيه الصوتي
                    </Label>
                    <p className="text-sm text-[#4a5568]">
                      تشغيل نغمة تنبيه هادئة وموجزة عند ورود رسالة جديدة
                    </p>
                  </div>
                  <Switch
                    id="sound-alerts"
                    checked={soundAlerts}
                    onCheckedChange={setSoundAlerts}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded">
                  <div className="space-y-1">
                    <Label htmlFor="daily-digest" className="text-base font-bold text-[#1a202c] cursor-pointer">
                      التقرير الصباحي اليومي
                    </Label>
                    <p className="text-sm text-[#4a5568]">
                      تلقي ملخص يومي في بداية ساعات الدوام بجميع المعاملات المعلقة
                    </p>
                  </div>
                  <Switch
                    id="daily-digest"
                    checked={dailyDigest}
                    onCheckedChange={setDailyDigest}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#e2e8f0] flex justify-end">
                <Button
                  type="button"
                  onClick={handleSaveNotificationPreferences}
                  className="h-11 px-8 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded shadow-none"
                >
                  <Save className="h-5 w-5 ml-2" />
                  حفظ تفضيلات الإشعارات
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 4: System & Display Preferences                       */}
        {/* ========================================================= */}
        <TabsContent value="preferences" className="space-y-6 mt-0">
          <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
            <CardHeader className="p-6 border-b border-[#e2e8f0]">
              <CardTitle className="text-xl font-bold text-[#1a202c] flex items-center gap-2 border-r-4 border-[#2c5282] pr-3">
                <Sliders className="h-5 w-5 text-[#2c5282]" />
                <span>تفضيلات العرض والمظهر</span>
              </CardTitle>
              <CardDescription className="text-base text-[#718096]">
                ضبط كثافة الجداول، عدد النتائج الافتراضي، وطريقة ترتيب السجلات
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="pref-density" className="text-base font-bold text-[#1a202c]">
                    كثافة العرض في جداول الوثائق
                  </Label>
                  <Select value={tableDensity} onValueChange={setTableDensity}>
                    <SelectTrigger id="pref-density" className="h-11 text-base border-[#cbd5e1] rounded bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comfortable">مريح (مسافات واسعة)</SelectItem>
                      <SelectItem value="standard">قياسي (متوازن 8 ساعات عمل)</SelectItem>
                      <SelectItem value="compact">مدمج (كثافة بيانات عالية)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">يحدد ارتفاع أسطر الجداول وتناسق الخطوط</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pref-items-per-page" className="text-base font-bold text-[#1a202c]">
                    عدد العناصر الافتراضي في الصفحة
                  </Label>
                  <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                    <SelectTrigger id="pref-items-per-page" className="h-11 text-base border-[#cbd5e1] rounded bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 عناصر</SelectItem>
                      <SelectItem value="25">25 عنصراً (موصى به)</SelectItem>
                      <SelectItem value="50">50 عنصراً</SelectItem>
                      <SelectItem value="100">100 عنصر</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">عدد سجلات المراسلات المعروضة قبل الانتقال للصفحة التالية</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="pref-sort-order" className="text-base font-bold text-[#1a202c]">
                    الترتيب الافتراضي للمراسلات
                  </Label>
                  <Select value={defaultSortOrder} onValueChange={setDefaultSortOrder}>
                    <SelectTrigger id="pref-sort-order" className="h-11 text-base border-[#cbd5e1] rounded bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">الأحدث تسجيلاً أولاً</SelectItem>
                      <SelectItem value="asc">الأقدم تسجيلاً أولاً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded self-end h-11 sm:h-auto">
                  <div className="space-y-0.5">
                    <Label htmlFor="pref-auto-open" className="text-base font-bold text-[#1a202c] cursor-pointer">
                      معاينة الـ PDF تلقائياً
                    </Label>
                    <p className="text-sm text-gray-500">فتح ملف الوثيقة الممسوحة عند النقر على السجل</p>
                  </div>
                  <Switch
                    id="pref-auto-open"
                    checked={autoOpenPdf}
                    onCheckedChange={setAutoOpenPdf}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#e2e8f0] flex justify-end">
                <Button
                  type="button"
                  onClick={handleSaveDisplayPreferences}
                  className="h-11 px-8 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded shadow-none"
                >
                  <Save className="h-5 w-5 ml-2" />
                  حفظ تفضيلات العرض
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 5: Backup & Archiving Overview                        */}
        {/* ========================================================= */}
        <TabsContent value="backup" className="space-y-6 mt-0">
          <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
            <CardHeader className="p-6 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-[#1a202c] flex items-center gap-2 border-r-4 border-[#2c5282] pr-3">
                  <Database className="h-5 w-5 text-[#2c5282]" />
                  <span>النسخ الاحتياطي وأرشفة البيانات</span>
                </CardTitle>
                <CardDescription className="text-base text-[#718096]">
                  متابعة وتأمين الوثائق والمرفقات بصيغة رقمية متكاملة
                </CardDescription>
              </div>

              <Button
                onClick={() => navigate('/dashboard/settings/backup')}
                className="h-11 px-6 text-base font-bold bg-[#FFCB56] hover:bg-[#FFD758] text-[#1a202c] rounded gap-2 shadow-none"
              >
                <span>الانتقال لإدارة النسخ الاحتياطي الكاملة</span>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Stats overview cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white border border-[#e2e8f0] rounded">
                  <div className="flex items-center gap-2 text-[#2c5282] mb-1">
                    <FileText className="h-5 w-5" />
                    <span className="text-base font-semibold">الوثائق الواردة</span>
                  </div>
                  <div className="text-3xl font-bold text-[#1a202c]">
                    {backupStats?.totalIncomingDocuments ?? '—'}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">مشمولة في الأرشيف</p>
                </div>

                <div className="p-5 bg-white border border-[#e2e8f0] rounded">
                  <div className="flex items-center gap-2 text-[#2c5282] mb-1">
                    <FileText className="h-5 w-5" />
                    <span className="text-base font-semibold">الوثائق الصادرة</span>
                  </div>
                  <div className="text-3xl font-bold text-[#1a202c]">
                    {backupStats?.totalOutgoingDocuments ?? '—'}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">مشمولة في الأرشيف</p>
                </div>

                <div className="p-5 bg-white border border-[#e2e8f0] rounded">
                  <div className="flex items-center gap-2 text-[#2c5282] mb-1">
                    <HardDrive className="h-5 w-5" />
                    <span className="text-base font-semibold">حجم البيانات الكلي</span>
                  </div>
                  <div className="text-2xl font-bold text-[#1a202c]">
                    {backupStats?.totalFileSize ?? '—'}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">المستندات والمرفقات</p>
                </div>

                <div className="p-5 bg-white border border-[#e2e8f0] rounded">
                  <div className="flex items-center gap-2 text-[#2c5282] mb-1">
                    <Clock className="h-5 w-5" />
                    <span className="text-base font-semibold">آخر نسخة احتياطية</span>
                  </div>
                  <div className="text-lg font-bold text-[#1a202c]">
                    {backupStats?.lastBackupDate ? new Date(backupStats.lastBackupDate).toLocaleDateString('ar') : 'لا توجد بعد'}
                  </div>
                  <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded text-xs font-bold bg-[#FFCB56] text-[#1a202c]">
                    محفوظة محلياً
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-[#1a202c]">النسخ الاحتياطي التلقائي المجدول</h4>
                  <p className="text-sm text-[#4a5568]">
                    يمكنك ضبط التكرار الأسبوعي أو الشهري وتحديد مجلد التصدير من خلال صفحة النسخ الاحتياطي
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard/settings/backup')}
                  className="h-11 px-6 text-base font-semibold border-[#cbd5e1] text-[#2c5282] hover:bg-blue-50 rounded"
                >
                  فتح إعدادات الجدولة
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 6: Message Retention & Cleanup Overview               */}
        {/* ========================================================= */}
        <TabsContent value="retention" className="space-y-6 mt-0">
          <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
            <CardHeader className="p-6 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-[#1a202c] flex items-center gap-2 border-r-4 border-[#2c5282] pr-3">
                  <MessageCircle className="h-5 w-5 text-[#2c5282]" />
                  <span>سياسة حفظ وحذف المراسلات</span>
                </CardTitle>
                <CardDescription className="text-base text-[#718096]">
                  إدارة سعة التخزين وتحديد فترة الاحتفاظ بالمراسلات والمرفقات
                </CardDescription>
              </div>

              <Button
                onClick={() => navigate('/dashboard/settings/message-retention')}
                className="h-11 px-6 text-base font-bold bg-[#FFCB56] hover:bg-[#FFD758] text-[#1a202c] rounded gap-2 shadow-none"
              >
                <span>الانتقال لإدارة الرسائل الكاملة</span>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="p-5 bg-white border border-[#e2e8f0] rounded">
                  <span className="text-base font-semibold text-[#4a5568]">إجمالي الرسائل في النظام</span>
                  <div className="text-3xl font-bold text-[#2c5282] mt-2">
                    {messagesStats?.totalMessages ?? 0}
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-[#2c5282] border border-blue-200 mt-2">
                    مراسلة مسجلة
                  </span>
                </div>

                <div className="p-5 bg-white border border-[#e2e8f0] rounded">
                  <span className="text-base font-semibold text-[#4a5568]">إجمالي المرفقات</span>
                  <div className="text-3xl font-bold text-emerald-700 mt-2">
                    {messagesStats?.totalAttachments ?? 0}
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-2">
                    ملف مرفق
                  </span>
                </div>

                <div className="p-5 bg-white border border-[#e2e8f0] rounded">
                  <span className="text-base font-semibold text-[#4a5568]">حالة الحذف التلقائي</span>
                  <div className="text-2xl font-bold text-[#1a202c] mt-2">
                    {retentionPolicy?.enabled ? 'مفعّل' : 'معطّل'}
                  </div>
                  <div className="mt-2">
                    {retentionPolicy?.enabled ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-[#FFCB56] text-[#1a202c]">
                        كل {retentionPolicy.period} {retentionPolicy.unit === 'months' ? 'أشهر' : retentionPolicy.unit === 'years' ? 'سنوات' : 'أيام'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        الاحتفاظ دائم
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-[#1a202c]">التنظيف اليدوي والأرشفة</h4>
                  <p className="text-sm text-[#4a5568]">
                    يمكنك حذف الرسائل الأقدم من مدة محددة أو تصديرها قبل الحذف من خلال صفحة إدارة الرسائل
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard/settings/message-retention')}
                  className="h-11 px-6 text-base font-semibold border-[#cbd5e1] text-[#2c5282] hover:bg-blue-50 rounded"
                >
                  تخصيص سياسة الحفظ
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 6: Organization & Setup Wizard Settings               */}
        {/* ========================================================= */}
        {(currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin') && (
          <TabsContent value="organization" className="space-y-6 mt-0">
            <Card className="border-[#e2e8f0] rounded shadow-sm">
              <CardHeader className="border-b border-[#e2e8f0] pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#ebf8ff] text-[#2c5282] rounded">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-[#1a202c]">
                        هوية المؤسسة والأقسام السيادية
                      </CardTitle>
                      <CardDescription className="text-sm text-[#718096] mt-0.5">
                        إدارة التسمية الرسمية، شعار المؤسسة، وتعيين الأقسام الوظيفية الرئيسية (RH، مكتب الضبط، الإدارة العامة)
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate('/setup')}
                    className="bg-[#2c5282] hover:bg-[#234269] text-white h-11 px-5 text-sm font-semibold rounded gap-2 self-start sm:self-auto"
                  >
                    <Sliders className="h-4 w-4" />
                    تشغيل معالج الإعداد (Setup Wizard)
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div className="p-5 bg-[#f7fafc] border border-[#e2e8f0] rounded space-y-3">
                    <span className="text-sm font-bold text-[#2c5282] block border-b border-gray-200 pb-2">
                      الهوية والتسمية الرسمية
                    </span>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">اسم الإدارة الحالي :</span>
                        <strong className="text-gray-900 font-bold">
                          {orgSettings?.nomAdministration || 'غير محدد'}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">حالة التكوين الإجمالي :</span>
                        {isSetupComplete ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                            مكتمل وجاهز
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                            بحاجة إلى تهيئة
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-[#f7fafc] border border-[#e2e8f0] rounded space-y-3">
                    <span className="text-sm font-bold text-[#2c5282] block border-b border-gray-200 pb-2">
                      الأقسام الوظيفية الرئيسية
                    </span>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">قسم الموارد البشرية (RH) :</span>
                        <strong className="text-gray-900 font-semibold">
                          {typeof orgSettings?.rhDepartmentId === 'object' && orgSettings?.rhDepartmentId !== null
                            ? (orgSettings.rhDepartmentId as { name?: string }).name || 'معرّف'
                            : orgSettings?.rhDepartmentId ? 'معرّف' : 'غير معيّن'}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">مكتب الضبط (BO) :</span>
                        <strong className="text-gray-900 font-semibold">
                          {typeof orgSettings?.bureauOrdreDepartmentId === 'object' && orgSettings?.bureauOrdreDepartmentId !== null
                            ? (orgSettings.bureauOrdreDepartmentId as { name?: string }).name || 'معرّف'
                            : orgSettings?.bureauOrdreDepartmentId ? 'معرّف' : 'غير معيّن'}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">الإدارة العامة (Direction) :</span>
                        <strong className="text-gray-900 font-semibold">
                          {typeof orgSettings?.bureauDirecteurDepartmentId === 'object' && orgSettings?.bureauDirecteurDepartmentId !== null
                            ? (orgSettings.bureauDirecteurDepartmentId as { name?: string }).name || 'معرّف'
                            : orgSettings?.bureauDirecteurDepartmentId ? 'معرّف' : 'غير معيّن'}
                        </strong>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[#2c5282]">إعادة تشغيل معالج الإعداد الموجه</h4>
                    <p className="text-xs text-gray-600">
                      يمكنك في أي وقت تحديث اسم المؤسسة أو إعادة توزيع الأقسام السيادية والوظائف الرئيسية من خلال المعالج الموجه المكون من 4 خطوات.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/setup')}
                    className="h-10 px-5 text-sm font-semibold border-[#2c5282] text-[#2c5282] hover:bg-[#ebf8ff] rounded shrink-0"
                  >
                    تعديل عبر المعالج
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ========================================================= */}
      {/* DIALOG 1: Change Password Modal (≥ 700px on desktop)     */}
      {/* ========================================================= */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent
          className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 space-y-6 shadow-sm"
          dir="rtl"
        >
          <DialogHeader className="pb-4 border-b border-[#e2e8f0]">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-[#2c5282] flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282] shrink-0">
                <Key className="h-5 w-5 text-[#2c5282]" />
              </div>
              <span>تغيير كلمة المرور</span>
            </DialogTitle>
            <DialogDescription className="text-base text-[#4a5568] mt-1">
              أدخل كلمة المرور الحالية ثم كلمة المرور الجديدة مع تأكيدها
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="modal-current-password" className="text-base font-bold text-[#1a202c]">
                كلمة المرور الحالية <span className="text-red-600">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="modal-current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية"
                  className="h-11 text-base border-[#cbd5e1] rounded pl-10 focus:border-[#2c5282]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#2c5282]"
                >
                  {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-new-password" className="text-base font-bold text-[#1a202c]">
                كلمة المرور الجديدة <span className="text-red-600">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="modal-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  className="h-11 text-base border-[#cbd5e1] rounded pl-10 focus:border-[#2c5282]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#2c5282]"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-confirm-password" className="text-base font-bold text-[#1a202c]">
                تأكيد كلمة المرور الجديدة <span className="text-red-600">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="modal-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور الجديدة"
                  className="h-11 text-base border-[#cbd5e1] rounded pl-10 focus:border-[#2c5282]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#2c5282]"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-[#e2e8f0]">
              <Button
                type="submit"
                disabled={updatePasswordMutation.isPending}
                className="h-11 px-7 rounded bg-[#2c5282] hover:bg-[#234269] text-white text-base font-semibold shadow-none"
              >
                {updatePasswordMutation.isPending ? 'جاري التحديث...' : 'تأكيد التغيير'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordModalOpen(false)}
                className="h-11 px-6 rounded border-[#cbd5e1] text-[#2d3748] hover:bg-gray-100 text-base font-medium"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* DIALOG 2: Terminate Sessions Modal (≥ 700px on desktop)  */}
      {/* ========================================================= */}
      <AlertDialog open={isTerminateSessionsOpen} onOpenChange={setIsTerminateSessionsOpen}>
        <AlertDialogContent
          className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 shadow-sm"
          dir="rtl"
        >
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-2">
              <LogOut className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl sm:text-2xl font-bold text-[#1a202c]">
              تأكيد إنهاء الجلسات النشطة الأخرى
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-[#4a5568] leading-relaxed mt-2">
              سيتم تسجيل الخروج الفوري من كافة الأجهزة والمتصفحات الأخرى المسجل الدخول إليها بحسابك، مع الإبقاء على الجلسة الحالية فقط.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-3 mt-6 pt-4 border-t border-[#e2e8f0]">
            <AlertDialogAction
              onClick={handleTerminateAllOtherSessions}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-base h-11 px-7 rounded shadow-none"
            >
              تأكيد إنهاء الجلسات
            </AlertDialogAction>
            <AlertDialogCancel className="border-[#cbd5e1] text-[#2d3748] hover:bg-gray-100 font-medium text-base h-11 px-6 rounded">
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
