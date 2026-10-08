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
  Mail,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  deleteMessagesByPeriod, 
  setRetentionPolicy, 
  getRetentionPolicy, 
  getMessagesStats,
  type RetentionPolicy,
  type MessagesStats
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
    unit: 'months' as 'days' | 'months' | 'years'
  });
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);

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
      setIsConfirmDeleteDialogOpen(false);
      const result = await deleteMessagesByPeriod(deleteForm.period, deleteForm.unit);
      toast.success(`تم حذف ${result.deletedCount} رسالة و ${result.deletedAttachments} مرفق بنجاح`);
      await loadData();
    } catch (error) {
      toast.error('خطأ في حذف الرسائل');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center bg-[#f7fafc]">
        <div className="text-center space-y-4">
          <RefreshCw className="h-10 w-10 mx-auto animate-spin text-[#2c5282]" />
          <p className="text-base text-[#4a5568]">جاري تحميل بيانات وسياسات الرسائل...</p>
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
            <MessageCircle className="h-6 w-6 text-[#2c5282]" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a202c]">إدارة الرسائل والأرشفة</h1>
              <span className="inline-flex items-center px-3 py-1 rounded text-sm font-bold bg-[#FFCB56] text-[#1a202c]">
                سياسة الحفظ
              </span>
            </div>
            <p className="text-base text-[#4a5568] mt-1 leading-relaxed">
              تحديد قواعد الحفظ التلقائي، تحليل سعة التخزين، والتنظيف الآمن للمراسلات القديمة
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={loadData}
          disabled={loading}
          className="h-11 px-5 rounded border-[#cbd5e1] text-[#2c5282] hover:bg-blue-50 font-semibold gap-2 self-start sm:self-center"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث البيانات</span>
        </Button>
      </div>

      {/* 2. Main Tabs */}
      <Tabs defaultValue="statistics" className="w-full space-y-6">
        <TabsList className="w-full flex flex-wrap h-auto p-1.5 bg-[#edf2f7] border border-[#e2e8f0] rounded gap-1.5">
          <TabsTrigger
            value="statistics"
            className="flex-1 min-w-[140px] py-3 text-base font-semibold rounded data-[state=active]:bg-white data-[state=active]:text-[#2c5282] data-[state=active]:shadow-sm text-[#4a5568] flex items-center justify-center gap-2"
          >
            <BarChart3 className="h-5 w-5" />
            <span>إحصائيات الرسائل</span>
          </TabsTrigger>

          <TabsTrigger
            value="retention"
            className="flex-1 min-w-[140px] py-3 text-base font-semibold rounded data-[state=active]:bg-white data-[state=active]:text-[#2c5282] data-[state=active]:shadow-sm text-[#4a5568] flex items-center justify-center gap-2"
          >
            <Clock className="h-5 w-5" />
            <span>سياسة الحفظ التلقائية</span>
          </TabsTrigger>

          <TabsTrigger
            value="cleanup"
            className="flex-1 min-w-[140px] py-3 text-base font-semibold rounded data-[state=active]:bg-white data-[state=active]:text-[#2c5282] data-[state=active]:shadow-sm text-[#4a5568] flex items-center justify-center gap-2"
          >
            <Trash2 className="h-5 w-5" />
            <span>التنظيف اليدوي والأرشفة</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Statistics */}
        <TabsContent value="statistics" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
              <CardHeader className="p-6 border-b border-[#e2e8f0]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282]">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-[#1a202c]">إجمالي المراسلات</CardTitle>
                    <CardDescription className="text-base text-[#718096]">عدد الرسائل المسجلة في النظام</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 text-center space-y-3">
                <div className="text-4xl font-bold text-[#2c5282]">{stats?.totalMessages || 0}</div>
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded text-sm font-semibold bg-[#2c5282] text-white">
                    رسالة نشطة
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
              <CardHeader className="p-6 border-b border-[#e2e8f0]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-[#1a202c]">إجمالي المرفقات</CardTitle>
                    <CardDescription className="text-base text-[#718096]">الملفات والمستندات الملحقة بالرسائل</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 text-center space-y-3">
                <div className="text-4xl font-bold text-emerald-700">{stats?.totalAttachments || 0}</div>
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded text-sm font-bold bg-[#FFCB56] text-[#1a202c]">
                    ملف مرفق
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Message Age Breakdown */}
          <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
            <CardHeader className="p-6 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282]">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-[#1a202c]">توزيع الرسائل حسب العمر</CardTitle>
                  <CardDescription className="text-base text-[#718096]">تصنيف المراسلات بحسب الفترة الزمنية لانقضائها</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded text-center">
                  <div className="text-2xl font-bold text-[#2c5282]">{stats?.messagesByAge?.lastMonth || 0}</div>
                  <div className="text-base font-semibold text-[#4a5568] mt-1">آخر شهر</div>
                </div>
                <div className="p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded text-center">
                  <div className="text-2xl font-bold text-emerald-700">{stats?.messagesByAge?.lastThreeMonths || 0}</div>
                  <div className="text-base font-semibold text-[#4a5568] mt-1">آخر 3 أشهر</div>
                </div>
                <div className="p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded text-center">
                  <div className="text-2xl font-bold text-[#b7791f]">{stats?.messagesByAge?.lastSixMonths || 0}</div>
                  <div className="text-base font-semibold text-[#4a5568] mt-1">آخر 6 أشهر</div>
                </div>
                <div className="p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded text-center">
                  <div className="text-2xl font-bold text-orange-700">{stats?.messagesByAge?.lastYear || 0}</div>
                  <div className="text-base font-semibold text-[#4a5568] mt-1">آخر سنة</div>
                </div>
                <div className="p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded text-center col-span-2 sm:col-span-1">
                  <div className="text-2xl font-bold text-red-700">{stats?.messagesByAge?.olderThanYear || 0}</div>
                  <div className="text-base font-semibold text-[#4a5568] mt-1">أقدم من سنة</div>
                </div>
              </div>

              {/* Storage Analysis */}
              <div className="p-5 bg-[#f7fafc] border border-[#e2e8f0] rounded space-y-4">
                <h4 className="text-base font-bold text-[#1a202c] flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-[#2c5282]" />
                  <span>تأثير التخزين والأداء</span>
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm text-[#4a5568] mb-1 font-medium">
                      <span>الرسائل الحديثة (آخر 3 أشهر)</span>
                      <span className="text-emerald-700 font-bold">استهلاك منخفض</span>
                    </div>
                    <Progress value={25} className="h-2.5 bg-gray-200" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm text-[#4a5568] mb-1 font-medium">
                      <span>الرسائل المؤرشفة والقديمة (أقدم من سنة)</span>
                      <span className="text-amber-700 font-bold">استهلاك مرتفع</span>
                    </div>
                    <Progress value={85} className="h-2.5 bg-gray-200" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Retention Policy */}
        <TabsContent value="retention" className="space-y-6 mt-0">
          <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
            <CardHeader className="p-6 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282]">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-[#1a202c]">سياسة الحفظ التلقائي</CardTitle>
                  <CardDescription className="text-base text-[#718096]">
                    تكوين جدولة الحذف التلقائي للمراسلات والمرفقات القديمة
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded">
                <div>
                  <Label htmlFor="enable-retention" className="text-base font-bold text-[#1a202c] cursor-pointer">
                    تفعيل الحذف التلقائي للمراسلات
                  </Label>
                  <p className="text-sm text-[#4a5568] mt-0.5">
                    حذف المراسلات والمرفقات تلقائياً بعد مرور فترة محددة لتوفير مساحة التخزين
                  </p>
                </div>
                <Switch
                  id="enable-retention"
                  checked={policy.enabled}
                  onCheckedChange={(checked) => setPolicy({ ...policy, enabled: checked })}
                />
              </div>

              {policy.enabled && (
                <div className="space-y-5 p-5 bg-white border border-[#e2e8f0] rounded">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="retention-period" className="text-base font-bold text-[#1a202c]">
                        المدة الزمنية للاحتفاظ
                      </Label>
                      <Input
                        id="retention-period"
                        type="number"
                        min="1"
                        max="999"
                        value={policy.period}
                        onChange={(e) => setPolicy({ ...policy, period: parseInt(e.target.value) || 1 })}
                        className="h-11 text-base border-[#cbd5e1] rounded bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="retention-unit" className="text-base font-bold text-[#1a202c]">
                        وحدة القياس
                      </Label>
                      <Select
                        value={policy.unit}
                        onValueChange={(value: 'days' | 'months' | 'years') => 
                          setPolicy({ ...policy, unit: value })
                        }
                      >
                        <SelectTrigger id="retention-unit" className="h-11 text-base border-[#cbd5e1] rounded bg-white">
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

                  <Alert className="border-blue-200 bg-blue-50 rounded">
                    <Calendar className="h-5 w-5 text-[#2c5282]" />
                    <AlertDescription className="text-base text-[#2c5282] font-medium mr-2">
                      سيتم حذف الرسائل والمرفقات تلقائياً كل {policy.period} {
                        policy.unit === 'days' ? 'أيام' : 
                        policy.unit === 'months' ? 'أشهر' : 'سنوات'
                      }. هذا الإجراء سيوفر مساحة تخزين ويحافظ على كفاءة واستجابة قاعدة البيانات.
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-end pt-2">
                    <Button 
                      onClick={handleSavePolicy} 
                      className="h-11 px-8 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded shadow-none"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-5 w-5 animate-spin ml-2" />
                          جاري الحفظ...
                        </>
                      ) : (
                        <>
                          <Settings className="h-5 w-5 ml-2" />
                          حفظ سياسة الحفظ
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Manual Cleanup */}
        <TabsContent value="cleanup" className="space-y-6 mt-0">
          <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
            <CardHeader className="p-6 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-red-50 text-red-600 flex items-center justify-center">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-red-700">تنظيف يدوي للرسائل</CardTitle>
                  <CardDescription className="text-base text-[#718096]">
                    حذف فوري للمراسلات والمرفقات الأقدم من فترة زمنية محددة
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="delete-period" className="text-base font-bold text-[#1a202c]">
                    المدة الزمنية
                  </Label>
                  <Input
                    id="delete-period"
                    type="number"
                    min="1"
                    max="999"
                    value={deleteForm.period}
                    onChange={(e) => setDeleteForm({ ...deleteForm, period: parseInt(e.target.value) || 1 })}
                    className="h-11 text-base border-[#cbd5e1] rounded bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delete-unit" className="text-base font-bold text-[#1a202c]">
                    وحدة القياس
                  </Label>
                  <Select
                    value={deleteForm.unit}
                    onValueChange={(value: 'days' | 'months' | 'years') => 
                      setDeleteForm({ ...deleteForm, unit: value })
                    }
                  >
                    <SelectTrigger id="delete-unit" className="h-11 text-base border-[#cbd5e1] rounded bg-white">
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
              <div className="p-5 bg-[#f7fafc] border border-[#e2e8f0] rounded space-y-3">
                <h4 className="text-base font-bold text-[#1a202c] flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-[#2c5282]" />
                  <span>تقدير التأثير المتوقع</span>
                </h4>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-white rounded border border-[#e2e8f0]">
                    <div className="text-2xl font-bold text-red-600">
                      {deleteForm.unit === 'years' && deleteForm.period >= 1 ? 
                        stats?.messagesByAge?.olderThanYear || 0 : 
                        stats?.messagesByAge?.lastSixMonths || 0
                      }
                    </div>
                    <div className="text-sm text-[#4a5568] mt-1 font-medium">رسائل مؤهلة للحذف</div>
                  </div>
                  <div className="p-3 bg-white rounded border border-[#e2e8f0]">
                    <div className="text-2xl font-bold text-emerald-700">~2.5 جيجابايت</div>
                    <div className="text-sm text-[#4a5568] mt-1 font-medium">مساحة تخزينية متوقع توفيرها</div>
                  </div>
                </div>
              </div>

              <Alert className="border-amber-300 bg-amber-50 rounded">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
                <AlertDescription className="text-base text-amber-900 font-medium mr-2">
                  تحذير: سيتم حذف جميع المراسلات والمرفقات الأقدم من {deleteForm.period} {
                    deleteForm.unit === 'days' ? 'أيام' : 
                    deleteForm.unit === 'months' ? 'أشهر' : 'سنوات'
                  } نهائياً. تأكد من عمل نسخة احتياطية أولاً قبل تنفيذ الحذف.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button 
                  type="button"
                  onClick={() => setIsConfirmDeleteDialogOpen(true)} 
                  className="h-11 px-8 text-base font-semibold bg-red-600 hover:bg-red-700 text-white rounded shadow-none flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  <Trash2 className="h-5 w-5" />
                  <span>تنفيذ عملية الحذف</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard/settings/backup')}
                  className="h-11 px-6 text-base font-bold bg-[#FFCB56] hover:bg-[#FFD758] text-[#1a202c] border border-[#FFCB56] rounded flex items-center justify-center gap-2"
                >
                  <Database className="h-5 w-5" />
                  <span>تصدير نسخة احتياطية أولاً</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Modal for Message Deletion (≥ 700px on desktop) */}
      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent
          className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 shadow-xl"
          dir="rtl"
        >
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl sm:text-2xl font-bold text-red-700">
              تأكيد حذف المراسلات نهائياً
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-[#4a5568] leading-relaxed mt-2">
              أنت على وشك حذف كافة المراسلات والمرفقات الأقدم من{' '}
              <strong className="text-[#1a202c]">
                {deleteForm.period} {deleteForm.unit === 'days' ? 'أيام' : deleteForm.unit === 'months' ? 'أشهر' : 'سنوات'}
              </strong>
              . لا يمكن استرجاع هذه البيانات بعد تأكيد الحذف. هل ترغب بالتأكيد؟
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-3 mt-6 pt-4 border-t border-[#e2e8f0]">
            <AlertDialogAction
              onClick={handleDeleteMessages}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-base h-11 px-7 rounded shadow-none"
            >
              تأكيد الحذف النهائي
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

export default MessageRetentionPage;
