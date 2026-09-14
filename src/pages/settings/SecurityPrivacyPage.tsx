import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  Key, 
  History, 
  UserCheck, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Smartphone,
  Monitor,
  ChevronLeft,
  Settings,
  RefreshCw,
  Download,
  Trash2,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface SecuritySettings {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    expirationDays: number;
  };
  twoFactorAuth: boolean;
  sessionTimeout: number;
  loginAttempts: number;
  accountLockoutTime: number;
  passwordHistory: number;
}

interface PrivacySettings {
  dataRetention: number;
  shareUsageStats: boolean;
  allowCookies: boolean;
  showOnlineStatus: boolean;
  dataExportEnabled: boolean;
  autoLogout: boolean;
}

interface LoginSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  loginTime: string;
  lastActivity: string;
  current: boolean;
  ip: string;
}

const SecurityPrivacyPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      expirationDays: 90
    },
    twoFactorAuth: false,
    sessionTimeout: 30,
    loginAttempts: 5,
    accountLockoutTime: 15,
    passwordHistory: 5
  });

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    dataRetention: 365,
    shareUsageStats: false,
    allowCookies: true,
    showOnlineStatus: true,
    dataExportEnabled: true,
    autoLogout: true
  });

  const [loginSessions, setLoginSessions] = useState<LoginSession[]>([
    {
      id: '1',
      device: 'كمبيوتر سطح المكتب (الإدارة)',
      browser: 'Chrome 120.0',
      location: 'الرياض، السعودية',
      loginTime: '2025-01-15 09:30',
      lastActivity: 'الآن',
      current: true,
      ip: '192.168.1.100'
    },
    {
      id: '2',
      device: 'هاتف محمول (تطبيق الويب)',
      browser: 'Safari Mobile',
      location: 'جدة، السعودية',
      loginTime: '2025-01-14 14:22',
      lastActivity: 'منذ ساعتين',
      current: false,
      ip: '192.168.1.101'
    }
  ]);

  const [passwordStrength, setPasswordStrength] = useState(75);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
    } catch (error) {
      toast.error('خطأ في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySettingsChange = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    setSecuritySettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePasswordPolicyChange = <K extends keyof SecuritySettings['passwordPolicy']>(key: K, value: SecuritySettings['passwordPolicy'][K]) => {
    setSecuritySettings(prev => ({
      ...prev,
      passwordPolicy: {
        ...prev.passwordPolicy,
        [key]: value
      }
    }));
  };

  const handlePrivacySettingsChange = <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
    setPrivacySettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.match(/[A-Z]/)) strength += 25;
    if (password.match(/[0-9]/)) strength += 25;
    if (password.match(/[^A-Za-z0-9]/)) strength += 25;
    return strength;
  };

  const handlePasswordChange = (password: string) => {
    setNewPassword(password);
    setPasswordStrength(calculatePasswordStrength(password));
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success('تم حفظ إعدادات الأمان والخصوصية بنجاح');
    } catch (error) {
      toast.error('خطأ في حفظ الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      setLoginSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('تم إنهاء الجلسة بنجاح');
    } catch (error) {
      toast.error('خطأ في إنهاء الجلسة');
    }
  };

  const exportData = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('تم تصدير سجلات الأمان بنجاح');
    } catch (error) {
      toast.error('خطأ في تصدير البيانات');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteAccount = async () => {
    setIsDeleteAccountModalOpen(false);
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('تم حذف الحساب بنجاح');
      navigate('/login');
    } catch (error) {
      toast.error('خطأ في حذف الحساب');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !securitySettings) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center bg-[#f7fafc]">
        <div className="text-center space-y-4">
          <RefreshCw className="h-10 w-10 mx-auto animate-spin text-[#2c5282]" />
          <p className="text-base text-[#4a5568]">جاري تحميل إعدادات الأمان...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6" dir="rtl">
      {/* 1. Header Section */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/settings')}
            className="h-11 w-11 p-0 rounded border-[#cbd5e1] text-[#2c5282] hover:bg-blue-50 shrink-0"
            title="العودة للإعدادات"
          >
            <ChevronLeft className="h-6 w-6 rtl-mirror" />
          </Button>
          <div className="w-12 h-12 rounded bg-[#2c5282]/10 border border-[#2c5282]/20 flex items-center justify-center text-[#2c5282] shrink-0">
            <Shield className="h-6 w-6 text-[#2c5282]" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a202c]">الأمان والخصوصية</h1>
              <span className="inline-flex items-center px-3 py-1 rounded text-sm font-bold bg-[#FFCB56] text-[#1a202c]">
                الحماية وسياسة الدخول
              </span>
            </div>
            <p className="text-base text-[#4a5568] mt-1 leading-relaxed">
              إدارة سياسات الدخول، تعقيد كلمات المرور، والتحكم بالجلسات النشطة
            </p>
          </div>
        </div>

        <Button
          onClick={saveSettings}
          disabled={loading}
          className="h-11 px-8 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded shadow-none gap-2 self-start sm:self-center"
        >
          {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Settings className="h-5 w-5" />}
          <span>{loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</span>
        </Button>
      </div>

      {/* 2. Main Tabs */}
      <Tabs defaultValue="security" className="w-full space-y-6">
        <TabsList className="w-full flex flex-wrap h-auto p-1.5 bg-[#edf2f7] border border-[#e2e8f0] rounded gap-1.5">
          <TabsTrigger
            value="security"
            className="flex-1 min-w-[140px] py-3 text-base font-semibold rounded data-[state=active]:bg-white data-[state=active]:text-[#2c5282] data-[state=active]:shadow-sm text-[#4a5568] flex items-center justify-center gap-2"
          >
            <Lock className="h-5 w-5" />
            <span>سياسات الأمان</span>
          </TabsTrigger>

          <TabsTrigger
            value="privacy"
            className="flex-1 min-w-[140px] py-3 text-base font-semibold rounded data-[state=active]:bg-white data-[state=active]:text-[#2c5282] data-[state=active]:shadow-sm text-[#4a5568] flex items-center justify-center gap-2"
          >
            <Eye className="h-5 w-5" />
            <span>الخصوصية وتصدير البيانات</span>
          </TabsTrigger>

          <TabsTrigger
            value="sessions"
            className="flex-1 min-w-[140px] py-3 text-base font-semibold rounded data-[state=active]:bg-white data-[state=active]:text-[#2c5282] data-[state=active]:shadow-sm text-[#4a5568] flex items-center justify-center gap-2"
          >
            <Monitor className="h-5 w-5" />
            <span>الجلسات النشطة</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Security Policies */}
        <TabsContent value="security" className="space-y-6 mt-0">
          {/* Password Policy Card */}
          <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
            <CardHeader className="p-6 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282]">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-[#1a202c]">سياسة تعقيد كلمات المرور</CardTitle>
                  <CardDescription className="text-base text-[#718096]">
                    تكوين شروط كلمة المرور الإلزامية للمستخدمين في النظام
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-base font-bold text-[#1a202c]">الحد الأدنى لطول كلمة المرور</Label>
                  <Input
                    type="number"
                    value={securitySettings.passwordPolicy.minLength}
                    onChange={(e) => handlePasswordPolicyChange('minLength', parseInt(e.target.value) || 8)}
                    min={6}
                    max={64}
                    className="h-11 text-base border-[#cbd5e1] rounded bg-white"
                  />
                  <p className="text-sm text-gray-500">موصى به: 8 أحرف على الأقل</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-bold text-[#1a202c]">دورة صلاحية كلمة المرور (أيام)</Label>
                  <Input
                    type="number"
                    value={securitySettings.passwordPolicy.expirationDays}
                    onChange={(e) => handlePasswordPolicyChange('expirationDays', parseInt(e.target.value) || 90)}
                    min={30}
                    max={365}
                    className="h-11 text-base border-[#cbd5e1] rounded bg-white"
                  />
                  <p className="text-sm text-gray-500">إلزام المستخدمين بتغيير كلمة المرور كل 90 يوماً</p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded">
                  <Label className="text-base font-bold text-[#1a202c] cursor-pointer">
                    إلزام باحتواء أحرف كبيرة (A-Z)
                  </Label>
                  <Switch
                    checked={securitySettings.passwordPolicy.requireUppercase}
                    onCheckedChange={(checked) => handlePasswordPolicyChange('requireUppercase', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded">
                  <Label className="text-base font-bold text-[#1a202c] cursor-pointer">
                    إلزام باحتواء أرقام (0-9)
                  </Label>
                  <Switch
                    checked={securitySettings.passwordPolicy.requireNumbers}
                    onCheckedChange={(checked) => handlePasswordPolicyChange('requireNumbers', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded">
                  <Label className="text-base font-bold text-[#1a202c] cursor-pointer">
                    إلزام باحتواء رموز خاصة (@#$%...)
                  </Label>
                  <Switch
                    checked={securitySettings.passwordPolicy.requireSpecialChars}
                    onCheckedChange={(checked) => handlePasswordPolicyChange('requireSpecialChars', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication Card */}
          <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
            <CardHeader className="p-6 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282]">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-[#1a202c]">المصادقة الثنائية (2FA)</CardTitle>
                  <CardDescription className="text-base text-[#718096]">
                    طبقة حماية إضافية تمنع الوصول غير المصرح به حتى عند تسرب كلمة المرور
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded">
                <div className="space-y-1">
                  <p className="text-base font-bold text-[#1a202c]">تفعيل المصادقة الثنائية للمستخدمين الإداريين</p>
                  <p className="text-sm text-[#4a5568]">
                    إرسال رمز تحقق مؤقت للبريد الإلكتروني عند الدخول من عنوان IP أو متصفح جديد
                  </p>
                </div>
                <Switch
                  checked={securitySettings.twoFactorAuth}
                  onCheckedChange={(checked) => handleSecuritySettingsChange('twoFactorAuth', checked)}
                />
              </div>

              {securitySettings.twoFactorAuth && (
                <Alert className="border-blue-200 bg-blue-50 rounded">
                  <CheckCircle className="h-5 w-5 text-[#2c5282]" />
                  <AlertDescription className="text-base text-[#2c5282] font-medium mr-2">
                    المصادقة الثنائية مفعلة لجميع الحسابات الإدارية.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Privacy Settings */}
        <TabsContent value="privacy" className="space-y-6 mt-0">
          <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
            <CardHeader className="p-6 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282]">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-[#1a202c]">الخصوصية وتصدير البيانات</CardTitle>
                  <CardDescription className="text-base text-[#718096]">
                    خيارات الاحتفاظ بسجلات الأمان وتصدير البيانات الإدارية
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded">
                  <div className="space-y-1">
                    <Label className="text-base font-bold text-[#1a202c] cursor-pointer">
                      تفعيل تصدير سجلات الأمان
                    </Label>
                    <p className="text-sm text-[#4a5568]">
                      السماح لمدير النظام بتنزيل تقرير بصيغة CSV لكافة عمليات الدخول
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.dataExportEnabled}
                    onCheckedChange={(checked) => handlePrivacySettingsChange('dataExportEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded">
                  <div className="space-y-1">
                    <Label className="text-base font-bold text-[#1a202c] cursor-pointer">
                      إظهار حالة الاتصال (متصل الآن)
                    </Label>
                    <p className="text-sm text-[#4a5568]">
                      إظهار شارة الاتصال في قائمة المستخدمين لزملائك في الإدارة
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.showOnlineStatus}
                    onCheckedChange={(checked) => handlePrivacySettingsChange('showOnlineStatus', checked)}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-[#e2e8f0]">
                <Button 
                  onClick={exportData}
                  disabled={loading}
                  className="h-11 px-6 text-base font-bold bg-[#FFCB56] hover:bg-[#FFD758] text-[#1a202c] rounded flex items-center justify-center gap-2 shadow-none"
                >
                  <Download className="h-5 w-5" />
                  <span>تصدير سجلات الأمان</span>
                </Button>

                <Button 
                  onClick={() => setIsDeleteAccountModalOpen(true)}
                  className="h-11 px-6 text-base font-semibold bg-red-600 hover:bg-red-700 text-white rounded flex items-center justify-center gap-2 shadow-none"
                >
                  <Trash2 className="h-5 w-5" />
                  <span>إلغاء تنشيط الحساب</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Active Sessions */}
        <TabsContent value="sessions" className="space-y-6 mt-0">
          <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
            <CardHeader className="p-6 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282]">
                  <Monitor className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-[#1a202c]">الجلسات النشطة حالياً</CardTitle>
                  <CardDescription className="text-base text-[#718096]">
                    الأجهزة والمتصفحات المسجل الدخول إليها بحسابك في الوقت الراهن
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {loginSessions.map((session) => (
                <div key={session.id} className="p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282] shrink-0">
                      {session.device.includes('محمول') ? 
                        <Smartphone className="h-6 w-6 text-[#2c5282]" /> : 
                        <Monitor className="h-6 w-6 text-[#2c5282]" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-base text-[#1a202c]">{session.device}</p>
                        {session.current && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-[#FFCB56] text-[#1a202c]">
                            الجلسة الحالية
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{session.browser} — {session.ip}</p>
                      <p className="text-xs text-gray-400 mt-0.5">الموقع: {session.location} | آخر نشاط: {session.lastActivity}</p>
                    </div>
                  </div>

                  {!session.current && (
                    <Button
                      variant="outline"
                      onClick={() => terminateSession(session.id)}
                      className="h-10 px-4 text-sm font-semibold border-red-200 text-red-600 hover:bg-red-50 rounded shrink-0 self-start sm:self-center"
                    >
                      إنهاء الجلسة
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Modal for Account Deletion / Deactivation (≥ 700px on desktop) */}
      <AlertDialog open={isDeleteAccountModalOpen} onOpenChange={setIsDeleteAccountModalOpen}>
        <AlertDialogContent
          className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 shadow-xl"
          dir="rtl"
        >
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl sm:text-2xl font-bold text-red-700">
              تأكيد إلغاء تنشيط الحساب
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-[#4a5568] leading-relaxed mt-2">
              هل أنت متأكد من رغبتك في إلغاء تنشيط هذا الحساب؟ لن تتمكن من تسجيل الدخول إلى المنظومة بعد تأكيد هذا الإجراء، وسيتم إخطار مدير النظام الرئيسي.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-3 mt-6 pt-4 border-t border-[#e2e8f0]">
            <AlertDialogAction
              onClick={confirmDeleteAccount}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-base h-11 px-7 rounded shadow-none"
            >
              تأكيد الإلغاء
            </AlertDialogAction>
            <AlertDialogCancel className="border-[#cbd5e1] text-[#2d3748] hover:bg-gray-100 font-medium text-base h-11 px-6 rounded">
              تراجع
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SecurityPrivacyPage;
