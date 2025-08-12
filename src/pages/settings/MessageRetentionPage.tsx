import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, 
  Trash2, 
  Calendar,
  AlertTriangle,
  Clock,
  Database,
  BarChart3,
  Settings,
  ChevronLeft,
  RefreshCw,
  Archive,
  FileText,
  HardDrive,
  TrendingUp,
  Users,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  deleteMessagesByPeriod, 
  setRetentionPolicy, 
  getRetentionPolicy, 
  getMessagesStats,
  type RetentionPolicy,
  type MessagesStats,
  type DeleteResult
} from '@/services/messageSettingsService';

const MessageRetentionPage = () => {
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<RetentionPolicy>({
    enabled: false,
    period: 6,
    unit: 'months'
  });
  const [stats, setStats] = useState<MessagesStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteForm, setDeleteForm] = useState({
    period: 3,
    unit: 'months'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [policyData, statsData] = await Promise.all([
        getRetentionPolicy(),
        getMessagesStats()
      ]);
      setPolicy(policyData);
      setStats(statsData);
    } catch (error) {
      toast.error('خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async () => {
    try {
      setLoading(true);
      await setRetentionPolicy(policy);
      toast.success('تم حفظ سياسة الاحتفاظ بنجاح');
    } catch (error) {
      toast.error('خطأ في حفظ سياسة الاحتفاظ');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessages = async () => {
    try {
      setLoading(true);
      const result = await deleteMessagesByPeriod(deleteForm.period, deleteForm.unit);
      toast.success(`تم حذف ${result.deletedCount} رسالة و ${result.deletedAttachments} مرفق`);
      await loadData(); // Refresh stats
    } catch (error) {
      toast.error('خطأ في حذف الرسائل');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="container-responsive min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="icon-responsive-lg mx-auto animate-spin text-primary" />
          <p className="text-muted-foreground">جاري تحميل بيانات الرسائل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive padding-responsive-lg space-y-6" dir="rtl">
      {/* Enhanced Header */}
      <div className="flex items-center gap-responsive mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/settings')}
          className="touch-target-sm"
        >
          <ChevronLeft className="icon-responsive rtl-mirror" />
        </Button>
        <MessageCircle className="icon-responsive-lg text-primary" />
        <div>
          <h1 className="text-responsive-xl font-bold text-foreground">إدارة الرسائل</h1>
          <p className="text-muted-foreground text-responsive-sm">إعدادات حذف وأرشفة الرسائل والمرفقات</p>
        </div>
      </div>

      <Tabs defaultValue="statistics" className="w-full">
        <TabsList className="grid-responsive-3 w-full">
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart3 className="icon-responsive" />
            <span className="hidden sm:inline">الإحصائيات</span>
          </TabsTrigger>
          <TabsTrigger value="retention" className="flex items-center gap-2">
            <Clock className="icon-responsive" />
            <span className="hidden sm:inline">سياسة الحفظ</span>
          </TabsTrigger>
          <TabsTrigger value="cleanup" className="flex items-center gap-2">
            <Trash2 className="icon-responsive" />
            <span className="hidden sm:inline">التنظيف</span>
          </TabsTrigger>
        </TabsList>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-6 mt-6">
          {/* Enhanced Message Statistics */}
          <div className="grid-responsive-2 gap-6">
            <Card className="enhanced-card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-responsive">
                  <Mail className="icon-responsive text-primary" />
                  <div>
                    <CardTitle className="text-responsive-lg text-primary">إجمالي الرسائل</CardTitle>
                    <CardDescription>عدد الرسائل في النظام</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-primary">{stats?.totalMessages || 0}</div>
                  <Badge variant="secondary" className="badge-responsive">رسالة</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="enhanced-card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardHeader>
                <div className="flex items-center gap-responsive">
                  <FileText className="icon-responsive text-green-600" />
                  <div>
                    <CardTitle className="text-responsive-lg text-green-700">إجمالي المرفقات</CardTitle>
                    <CardDescription>عدد الملفات المرفقة</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-green-600">{stats?.totalAttachments || 0}</div>
                  <Badge variant="outline" className="badge-responsive border-green-200 text-green-700">مرفق</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Message Age Distribution */}
          <Card className="enhanced-card">
            <CardHeader>
              <div className="flex items-center gap-responsive">
                <TrendingUp className="icon-responsive text-primary" />
                <div>
                  <CardTitle className="text-responsive-lg">توزيع الرسائل حسب العمر</CardTitle>
                  <CardDescription>تحليل عمر الرسائل في النظام</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">{stats?.messagesByAge?.lastMonth || 0}</div>
                    <div className="text-responsive-xs text-blue-700">آخر شهر</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold text-green-600">{stats?.messagesByAge?.lastThreeMonths || 0}</div>
                    <div className="text-responsive-xs text-green-700">آخر 3 أشهر</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-xl font-bold text-yellow-600">{stats?.messagesByAge?.lastSixMonths || 0}</div>
                    <div className="text-responsive-xs text-yellow-700">آخر 6 أشهر</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-xl font-bold text-orange-600">{stats?.messagesByAge?.lastYear || 0}</div>
                    <div className="text-responsive-xs text-orange-700">آخر سنة</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-xl font-bold text-red-600">{stats?.messagesByAge?.olderThanYear || 0}</div>
                    <div className="text-responsive-xs text-red-700">أقدم من سنة</div>
                  </div>
                </div>

                {/* Storage Impact Visualization */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-responsive-sm mb-3">تأثير التخزين</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-responsive-xs">
                      <span>الرسائل الحديثة (آخر 3 أشهر)</span>
                      <span>منخفض</span>
                    </div>
                    <Progress value={25} className="h-2" />
                    <div className="flex justify-between text-responsive-xs">
                      <span>الرسائل القديمة (أقدم من سنة)</span>
                      <span>مرتفع</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retention Policy Tab */}
        <TabsContent value="retention" className="space-y-6 mt-6">
          {/* Enhanced Automatic Retention Policy */}
          <Card className="enhanced-card">
            <CardHeader>
              <div className="flex items-center gap-responsive">
                <Clock className="icon-responsive text-primary" />
                <div>
                  <CardTitle className="text-responsive-lg">سياسة الحفظ التلقائية</CardTitle>
                  <CardDescription>تحديد قواعد الحذف التلقائي للرسائل والمرفقات القديمة</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enable-retention" className="text-responsive-sm font-medium">
                    تفعيل الحذف التلقائي
                  </Label>
                  <p className="text-responsive-xs text-muted-foreground">
                    حذف الرسائل والمرفقات تلقائياً بعد فترة محددة لتوفير مساحة التخزين
                  </p>
                </div>
                <Switch
                  id="enable-retention"
                  checked={policy.enabled}
                  onCheckedChange={(checked) => setPolicy({ ...policy, enabled: checked })}
                />
              </div>

              {policy.enabled && (
                <>
                  <Separator />
                  <div className="form-grid-responsive">
                    <div className="space-y-2">
                      <Label htmlFor="retention-period">المدة الزمنية</Label>
                      <Input
                        id="retention-period"
                        type="number"
                        min="1"
                        max="999"
                        value={policy.period}
                        onChange={(e) => setPolicy({ ...policy, period: parseInt(e.target.value) || 1 })}
                        className="input-responsive"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="retention-unit">الوحدة</Label>
                      <Select
                        value={policy.unit}
                        onValueChange={(value: 'days' | 'months' | 'years') => 
                          setPolicy({ ...policy, unit: value })
                        }
                      >
                        <SelectTrigger className="input-responsive">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">أيام</SelectItem>
                          <SelectItem value="months">أشهر</SelectItem>
                          <SelectItem value="years">سنوات</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Alert className="border-primary/20 bg-primary/5">
                    <Calendar className="icon-responsive" />
                    <AlertDescription>
                      سيتم حذف الرسائل والمرفقات تلقائياً كل {policy.period} {
                        policy.unit === 'days' ? 'أيام' : 
                        policy.unit === 'months' ? 'أشهر' : 'سنوات'
                      }. هذا الإجراء سيحرر مساحة تخزين كبيرة ويحسن أداء النظام.
                    </AlertDescription>
                  </Alert>

                  <Button 
                    onClick={handleSavePolicy} 
                    className="w-full professional-button"
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
                        حفظ سياسة الحفظ
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Cleanup Tab */}
        <TabsContent value="cleanup" className="space-y-6 mt-6">
          {/* Enhanced Manual Message Deletion */}
          <Card className="enhanced-card border-destructive/20">
            <CardHeader>
              <div className="flex items-center gap-responsive">
                <Trash2 className="icon-responsive text-destructive" />
                <div>
                  <CardTitle className="text-responsive-lg text-destructive">تنظيف يدوي للرسائل</CardTitle>
                  <CardDescription>حذف فوري للرسائل والمرفقات الأقدم من فترة زمنية محددة</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="form-grid-responsive">
                <div className="space-y-2">
                  <Label htmlFor="delete-period">المدة الزمنية</Label>
                  <Input
                    id="delete-period"
                    type="number"
                    min="1"
                    max="999"
                    value={deleteForm.period}
                    onChange={(e) => setDeleteForm({ ...deleteForm, period: parseInt(e.target.value) || 1 })}
                    className="input-responsive"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delete-unit">الوحدة</Label>
                  <Select
                    value={deleteForm.unit}
                    onValueChange={(value: 'days' | 'months' | 'years') => 
                      setDeleteForm({ ...deleteForm, unit: value })
                    }
                  >
                    <SelectTrigger className="input-responsive">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">أيام</SelectItem>
                      <SelectItem value="months">أشهر</SelectItem>
                      <SelectItem value="years">سنوات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Impact Preview */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <h4 className="font-medium text-responsive-sm flex items-center gap-2">
                  <HardDrive className="icon-responsive" />
                  تقدير التأثير
                </h4>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-2 bg-background rounded border">
                    <div className="text-lg font-bold text-destructive">
                      {deleteForm.unit === 'years' && deleteForm.period >= 1 ? 
                        stats?.messagesByAge?.olderThanYear || 0 : 
                        stats?.messagesByAge?.lastSixMonths || 0
                      }
                    </div>
                    <div className="text-responsive-xs text-muted-foreground">رسائل ستُحذف</div>
                  </div>
                  <div className="p-2 bg-background rounded border">
                    <div className="text-lg font-bold text-green-600">~2.5 GB</div>
                    <div className="text-responsive-xs text-muted-foreground">مساحة ستُوفر</div>
                  </div>
                </div>
              </div>

              <Alert className="border-destructive/20 bg-destructive/5">
                <AlertTriangle className="icon-responsive" />
                <AlertDescription>
                  تحذير: سيتم حذف جميع الرسائل والمرفقات الأقدم من {deleteForm.period} {
                    deleteForm.unit === 'days' ? 'أيام' : 
                    deleteForm.unit === 'months' ? 'أشهر' : 'سنوات'
                  } نهائياً ولا يمكن استرجاعها. تأكد من إجراء نسخة احتياطية قبل المتابعة.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={handleDeleteMessages} 
                variant="destructive" 
                className="w-full flex items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="icon-responsive animate-spin" />
                    جاري الحذف...
                  </>
                ) : (
                  <>
                    <Trash2 className="icon-responsive" />
                    تنفيذ عملية الحذف
                  </>
                )}
              </Button>

              {/* Additional Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button variant="outline" className="flex-1 flex items-center gap-2">
                  <Archive className="icon-responsive" />
                  أرشفة بدلاً من الحذف
                </Button>
                <Button variant="outline" className="flex-1 flex items-center gap-2">
                  <Database className="icon-responsive" />
                  تصدير قبل الحذف
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MessageRetentionPage;