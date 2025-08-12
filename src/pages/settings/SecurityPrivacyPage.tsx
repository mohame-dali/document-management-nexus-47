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

  const [loginSessions] = useState<LoginSession[]>([
    {
      id: '1',
      device: 'كمبيوتر سطح المكتب',
      browser: 'Chrome 120.0',
      location: 'الرياض، السعودية',
      loginTime: '2024-01-15 09:30',
      lastActivity: 'الآن',
      current: true,
      ip: '192.168.1.100'
    },
    {
      id: '2',
      device: 'هاتف محمول',
      browser: 'Safari Mobile',
      location: 'جدة، السعودية',
      loginTime: '2024-01-14 14:22',
      lastActivity: 'منذ 2 ساعة',
      current: false,
      ip: '192.168.1.101'
    }
  ]);

  const [passwordStrength, setPasswordStrength] = useState(75);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Settings are already initialized in state
    } catch (error) {
      toast.error('خطأ في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySettingsChange = (key: keyof SecuritySettings, value: any) => {
    setSecuritySettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePasswordPolicyChange = (key: string, value: any) => {
    setSecuritySettings(prev => ({
      ...prev,
      passwordPolicy: {
        ...prev.passwordPolicy,
        [key]: value
      }
    }));
  };

  const handlePrivacySettingsChange = (key: keyof PrivacySettings, value: any) => {
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      toast.error('خطأ في حفظ الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('تم إنهاء الجلسة بنجاح');
    } catch (error) {
      toast.error('خطأ في إنهاء الجلسة');
    }
  };

  const exportData = async () => {
    try {
      // Simulate data export
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('تم تصدير البيانات بنجاح');
    } catch (error) {
      toast.error('خطأ في تصدير البيانات');
    }
  };

  const deleteAccount = async () => {
    if (window.confirm('هل أنت متأكد من حذف الحساب؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      try {
        // Simulate account deletion
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success('تم حذف الحساب');
        navigate('/login');
      } catch (error) {
        toast.error('خطأ في حذف الحساب');
      }
    }
  };

  if (loading && !securitySettings) {
    return (
      <div className="container-responsive min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="icon-responsive-lg mx-auto animate-spin text-primary" />
          <p className="text-muted-foreground">جاري تحميل إعدادات الأمان...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive padding-responsive-lg space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-responsive mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/settings')}
          className="touch-target-sm"
        >
          <ChevronLeft className="icon-responsive rtl-mirror" />
        </Button>
        <Shield className="icon-responsive-lg text-primary" />
        <div>
          <h1 className="text-responsive-xl font-bold text-foreground">الأمان والخصوصية</h1>
          <p className="text-muted-foreground text-responsive-sm">إدارة إعدادات الأمان وحماية البيانات</p>
        </div>
      </div>

      <Tabs defaultValue="security" className="w-full">
        <TabsList className="grid-responsive-3 w-full">
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="icon-responsive" />
            <span className="hidden sm:inline">الأمان</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Eye className="icon-responsive" />
            <span className="hidden sm:inline">الخصوصية</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Monitor className="icon-responsive" />
            <span className="hidden sm:inline">الجلسات</span>
          </TabsTrigger>
        </TabsList>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6 mt-6">
          {/* Password Policy */}
          <Card className="enhanced-card">
            <CardHeader>
              <div className="flex items-center gap-responsive">
                <Key className="icon-responsive text-primary" />
                <div>
                  <CardTitle className="text-responsive-lg">سياسة كلمات المرور</CardTitle>
                  <CardDescription>تكوين متطلبات كلمات المرور للنظام</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="form-grid-responsive">
                <div className="space-y-2">
                  <Label>الحد الأدنى لطول كلمة المرور</Label>
                  <Input
                    type="number"
                    value={securitySettings.passwordPolicy.minLength}
                    onChange={(e) => handlePasswordPolicyChange('minLength', parseInt(e.target.value))}
                    min={6}
                    max={128}
                    className="input-responsive"
                  />
                </div>
                <div className="space-y-2">
                  <Label>انتهاء صلاحية كلمة المرور (أيام)</Label>
                  <Input
                    type="number"
                    value={securitySettings.passwordPolicy.expirationDays}
                    onChange={(e) => handlePasswordPolicyChange('expirationDays', parseInt(e.target.value))}
                    min={30}
                    max={365}
                    className="input-responsive"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>يجب أن تحتوي على أحرف كبيرة</Label>
                  <Switch
                    checked={securitySettings.passwordPolicy.requireUppercase}
                    onCheckedChange={(checked) => handlePasswordPolicyChange('requireUppercase', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>يجب أن تحتوي على أرقام</Label>
                  <Switch
                    checked={securitySettings.passwordPolicy.requireNumbers}
                    onCheckedChange={(checked) => handlePasswordPolicyChange('requireNumbers', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>يجب أن تحتوي على رموز خاصة</Label>
                  <Switch
                    checked={securitySettings.passwordPolicy.requireSpecialChars}
                    onCheckedChange={(checked) => handlePasswordPolicyChange('requireSpecialChars', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle className="text-responsive-lg">تغيير كلمة المرور</CardTitle>
              <CardDescription>قم بتحديث كلمة المرور الخاصة بك</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Input
                    type={showPasswords ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="input-responsive pr-10"
                    placeholder="أدخل كلمة المرور الجديدة"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 touch-target-sm"
                    onClick={() => setShowPasswords(!showPasswords)}
                  >
                    {showPasswords ? <EyeOff className="icon-responsive" /> : <Eye className="icon-responsive" />}
                  </Button>
                </div>
                {newPassword && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-responsive-xs">
                      <span>قوة كلمة المرور</span>
                      <span>{passwordStrength}%</span>
                    </div>
                    <Progress value={passwordStrength} className="h-2" />
                    <div className="flex justify-center">
                      <Badge variant={passwordStrength < 50 ? "destructive" : passwordStrength < 75 ? "secondary" : "default"}>
                        {passwordStrength < 50 ? "ضعيفة" : passwordStrength < 75 ? "متوسطة" : "قوية"}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>تأكيد كلمة المرور</Label>
                <Input
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-responsive"
                  placeholder="أعد إدخال كلمة المرور"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-destructive text-responsive-xs">كلمات المرور غير متطابقة</p>
                )}
              </div>

              <Button 
                className="w-full professional-button"
                disabled={!newPassword || newPassword !== confirmPassword || passwordStrength < 50}
              >
                تحديث كلمة المرور
              </Button>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card className="enhanced-card">
            <CardHeader>
              <div className="flex items-center gap-responsive">
                <UserCheck className="icon-responsive text-primary" />
                <div>
                  <CardTitle className="text-responsive-lg">المصادقة الثنائية</CardTitle>
                  <CardDescription>أضف طبقة حماية إضافية لحسابك</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">تفعيل المصادقة الثنائية</p>
                  <p className="text-responsive-sm text-muted-foreground">
                    استخدم تطبيق المصادقة للحصول على رموز الأمان
                  </p>
                </div>
                <Switch
                  checked={securitySettings.twoFactorAuth}
                  onCheckedChange={(checked) => handleSecuritySettingsChange('twoFactorAuth', checked)}
                />
              </div>
              {securitySettings.twoFactorAuth && (
                <Alert className="mt-4">
                  <CheckCircle className="icon-responsive" />
                  <AlertDescription>
                    المصادقة الثنائية مفعلة. حسابك محمي بطبقة أمان إضافية.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Session Security */}
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle className="text-responsive-lg">أمان الجلسات</CardTitle>
              <CardDescription>إعدادات انتهاء الجلسات والأمان</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="form-grid-responsive">
                <div className="space-y-2">
                  <Label>انتهاء صلاحية الجلسة (دقيقة)</Label>
                  <Input
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => handleSecuritySettingsChange('sessionTimeout', parseInt(e.target.value))}
                    min={5}
                    max={480}
                    className="input-responsive"
                  />
                </div>
                <div className="space-y-2">
                  <Label>عدد محاولات الدخول المسموحة</Label>
                  <Input
                    type="number"
                    value={securitySettings.loginAttempts}
                    onChange={(e) => handleSecuritySettingsChange('loginAttempts', parseInt(e.target.value))}
                    min={3}
                    max={10}
                    className="input-responsive"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6 mt-6">
          {/* Data Management */}
          <Card className="enhanced-card">
            <CardHeader>
              <div className="flex items-center gap-responsive">
                <FileText className="icon-responsive text-primary" />
                <div>
                  <CardTitle className="text-responsive-lg">إدارة البيانات</CardTitle>
                  <CardDescription>التحكم في بياناتك وخصوصيتها</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>فترة الاحتفاظ بالبيانات (أيام)</Label>
                <Input
                  type="number"
                  value={privacySettings.dataRetention}
                  onChange={(e) => handlePrivacySettingsChange('dataRetention', parseInt(e.target.value))}
                  min={30}
                  max={2555}
                  className="input-responsive"
                />
                <p className="text-responsive-xs text-muted-foreground">
                  ستُحذف البيانات تلقائياً بعد انتهاء هذه المدة
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>مشاركة إحصائيات الاستخدام</Label>
                    <p className="text-responsive-xs text-muted-foreground">مساعدتنا في تحسين النظام</p>
                  </div>
                  <Switch
                    checked={privacySettings.shareUsageStats}
                    onCheckedChange={(checked) => handlePrivacySettingsChange('shareUsageStats', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>السماح بملفات تعريف الارتباط</Label>
                    <p className="text-responsive-xs text-muted-foreground">ضروري لتشغيل النظام</p>
                  </div>
                  <Switch
                    checked={privacySettings.allowCookies}
                    onCheckedChange={(checked) => handlePrivacySettingsChange('allowCookies', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>إظهار حالة الاتصال</Label>
                    <p className="text-responsive-xs text-muted-foreground">إظهار متى كنت متصلاً آخر مرة</p>
                  </div>
                  <Switch
                    checked={privacySettings.showOnlineStatus}
                    onCheckedChange={(checked) => handlePrivacySettingsChange('showOnlineStatus', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Export & Deletion */}
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle className="text-responsive-lg">تصدير وحذف البيانات</CardTitle>
              <CardDescription>إدارة بياناتك الشخصية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={exportData}
                  className="flex-1 flex items-center gap-2"
                  variant="outline"
                >
                  <Download className="icon-responsive" />
                  تصدير بياناتي
                </Button>
                <Button 
                  onClick={deleteAccount}
                  className="flex-1 flex items-center gap-2"
                  variant="destructive"
                >
                  <Trash2 className="icon-responsive" />
                  حذف الحساب
                </Button>
              </div>
              
              <Alert>
                <AlertTriangle className="icon-responsive" />
                <AlertDescription>
                  حذف الحساب إجراء نهائي ولا يمكن التراجع عنه. ستفقد جميع البيانات المرتبطة بحسابك.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6 mt-6">
          <Card className="enhanced-card">
            <CardHeader>
              <div className="flex items-center gap-responsive">
                <Monitor className="icon-responsive text-primary" />
                <div>
                  <CardTitle className="text-responsive-lg">الجلسات النشطة</CardTitle>
                  <CardDescription>إدارة جلسات تسجيل الدخول الخاصة بك</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loginSessions.map((session) => (
                  <div key={session.id} className="border border-border rounded-lg card-responsive-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-accent rounded-lg">
                          {session.device.includes('محمول') ? 
                            <Smartphone className="icon-responsive text-accent-foreground" /> : 
                            <Monitor className="icon-responsive text-accent-foreground" />
                          }
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-responsive-sm">{session.device}</p>
                            {session.current && (
                              <Badge variant="default" className="badge-responsive">الجلسة الحالية</Badge>
                            )}
                          </div>
                          <p className="text-responsive-xs text-muted-foreground">{session.browser}</p>
                          <p className="text-responsive-xs text-muted-foreground flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {session.location}
                          </p>
                          <p className="text-responsive-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            آخر نشاط: {session.lastActivity}
                          </p>
                        </div>
                      </div>
                      {!session.current && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => terminateSession(session.id)}
                          className="touch-target-sm"
                        >
                          إنهاء
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-center pt-6">
        <Button 
          onClick={saveSettings}
          className="professional-button min-w-32"
          disabled={loading}
        >
          {loading ? (
            <>
              <RefreshCw className="icon-responsive animate-spin ml-2" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Settings className="icon-responsive ml-2" />
              حفظ الإعدادات
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SecurityPrivacyPage;