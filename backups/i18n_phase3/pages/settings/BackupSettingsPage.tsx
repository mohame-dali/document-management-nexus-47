import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  backupService, 
  BackupStats, 
  BackupPolicy 
} from '@/services/backupService';
import { 
  Download, 
  Upload, 
  Settings, 
  Clock, 
  HardDrive, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Calendar,
  Archive,
  Zap,
  FolderOpen,
  Info,
  Database,
  ChevronLeft,
  Shield,
  RefreshCw
} from 'lucide-react';

const BackupSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [policy, setPolicy] = useState<BackupPolicy>({
    enabled: false,
    frequency: 'daily',
    retentionDays: 30,
    includeAttachments: true,
    compressionLevel: 'medium',
  });
  const [loading, setLoading] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [isYearlyBackup, setIsYearlyBackup] = useState(false);
  const [exportPath, setExportPath] = useState<string>('');
  const [savedBackupPath, setSavedBackupPath] = useState<string>('');
  const [currentBackupId, setCurrentBackupId] = useState<string | null>(null);
  const [lastBackupInfo, setLastBackupInfo] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadSavedPath();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, policyData] = await Promise.all([
        backupService.getBackupStats(),
        backupService.getBackupPolicy(),
      ]);
      setStats(statsData);
      setPolicy(policyData);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "خطأ في تحميل بيانات النسخ الاحتياطي",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSavedPath = () => {
    const savedPath = localStorage.getItem('backup_default_path');
    if (savedPath) {
      setSavedBackupPath(savedPath);
      setExportPath(savedPath);
    }
  };

  const saveDefaultPath = (path: string) => {
    if (path) {
      localStorage.setItem('backup_default_path', path);
      setSavedBackupPath(path);
      toast({
        title: "نجح",
        description: "تم حفظ المسار الافتراضي بنجاح",
      });
    }
  };

  const handleSavePolicy = async () => {
    try {
      setLoading(true);
      await backupService.updateBackupPolicy(policy);
      toast({
        title: "نجح",
        description: "تم حفظ إعدادات النسخ الاحتياطي بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "خطأ في حفظ الإعدادات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsBackingUp(true);
      setBackupProgress(0);
      
      if (exportPath && exportPath.trim()) {
        saveDefaultPath(exportPath.trim());
      }

      const response = await backupService.createBackup(
        isYearlyBackup ? parseInt(selectedYear) : undefined,
        exportPath || undefined
      );
      setCurrentBackupId(response.backupId);
      
      const pollStatus = async () => {
        try {
          const status = await backupService.getBackupStatus(response.backupId);
          
          if (status.status === 'completed') {
            setBackupProgress(100);
            setIsBackingUp(false);
            setCurrentBackupId(null);
            
            const actualPath = status.filePath || exportPath || '/tmp/backups';
            const successMessage = isYearlyBackup ? 
              `تم إنشاء النسخة الاحتياطية لعام ${selectedYear} بنجاح` : 
              `تم إنشاء النسخة الاحتياطية بنجاح`;
            
            const fullMessage = `${successMessage} - المحفوظة في: ${actualPath}`;
            setLastBackupInfo(fullMessage);
            
            toast({
              title: "نجح",
              description: fullMessage,
            });
            loadData();
          } else if (status.status === 'failed') {
            setIsBackingUp(false);
            setCurrentBackupId(null);
            toast({
              title: "خطأ",
              description: `خطأ في إنشاء النسخة الاحتياطية: ${status.errorMessage || 'خطأ غير معروف'}`,
              variant: "destructive",
            });
          } else {
            setBackupProgress(prev => Math.min(prev + 10, 90));
            setTimeout(pollStatus, 2000);
          }
        } catch (error) {
          setIsBackingUp(false);
          setCurrentBackupId(null);
          toast({
            title: "خطأ",
            description: "خطأ في متابعة حالة النسخة الاحتياطية",
            variant: "destructive",
          });
        }
      };
      
      setTimeout(pollStatus, 2000);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "خطأ في إنشاء النسخة الاحتياطية",
        variant: "destructive",
      });
      setIsBackingUp(false);
      setCurrentBackupId(null);
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'يومياً';
      case 'weekly': return 'أسبوعياً';
      case 'monthly': return 'شهرياً';
      default: return frequency;
    }
  };

  if (loading && !stats) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center bg-[#f7fafc]">
        <div className="text-center space-y-4">
          <RefreshCw className="h-10 w-10 mx-auto animate-spin text-[#2c5282]" />
          <p className="text-base text-[#4a5568]">جاري تحميل بيانات النسخ الاحتياطي...</p>
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
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a202c]">النسخ الاحتياطي وأرشفة البيانات</h1>
              <span className="inline-flex items-center px-3 py-1 rounded text-sm font-bold bg-[#FFCB56] text-[#1a202c]">
                أرشيف الوثائق
              </span>
            </div>
            <p className="text-base text-[#4a5568] mt-1 leading-relaxed">
              إدارة وحماية الوثائق الواردة والصادرة مع ملفات PDF والمرفقات
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
          <span>تحديث الإحصائيات</span>
        </Button>
      </div>

      {/* 2. Statistics Card */}
      {stats && (
        <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
          <CardHeader className="p-6 border-b border-[#e2e8f0]">
            <CardTitle className="text-xl font-bold text-[#1a202c] flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282]">
                <Archive className="h-5 w-5 text-[#2c5282]" />
              </div>
              <span>إحصائيات البيانات المتوفرة للأرشفة</span>
            </CardTitle>
            <CardDescription className="text-base text-[#718096]">
              نظرة تفصيلية على حجم الوثائق والمراسلات المتاحة للنسخ الاحتياطي
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-5 bg-white border border-[#e2e8f0] rounded text-center">
                <div className="w-10 h-10 rounded bg-blue-50 text-[#2c5282] flex items-center justify-center mx-auto mb-2">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="text-3xl font-bold text-[#2c5282]">{stats.totalIncomingDocuments}</div>
                <div className="text-base font-semibold text-[#4a5568] mt-1">الوثائق الواردة</div>
              </div>

              <div className="p-5 bg-white border border-[#e2e8f0] rounded text-center">
                <div className="w-10 h-10 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="text-3xl font-bold text-emerald-700">{stats.totalOutgoingDocuments}</div>
                <div className="text-base font-semibold text-[#4a5568] mt-1">الوثائق الصادرة</div>
              </div>

              <div className="p-5 bg-white border border-[#e2e8f0] rounded text-center">
                <div className="w-10 h-10 rounded bg-purple-50 text-purple-700 flex items-center justify-center mx-auto mb-2">
                  <HardDrive className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold text-purple-800">{stats.totalFileSize}</div>
                <div className="text-base font-semibold text-[#4a5568] mt-1">إجمالي حجم البيانات</div>
              </div>

              <div className="p-5 bg-white border border-[#e2e8f0] rounded text-center">
                <div className="w-10 h-10 rounded bg-[#FFCB56]/20 text-[#1a202c] flex items-center justify-center mx-auto mb-2">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="text-xl font-bold text-[#1a202c]">
                  {stats.lastBackupDate ? new Date(stats.lastBackupDate).toLocaleDateString('ar') : 'لا توجد بعد'}
                </div>
                <div className="text-base font-semibold text-[#4a5568] mt-1">آخر نسخة احتياطية</div>
              </div>
            </div>
            
            <Separator className="bg-[#e2e8f0]" />
            
            <div className="space-y-3">
              <h4 className="text-base font-bold text-[#1a202c] flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#2c5282]" />
                <span>إحصائيات الوثائق المضافة مؤخراً</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-[#f7fafc] border border-[#e2e8f0] rounded text-center">
                  <span className="text-base font-bold text-[#2c5282]">اليوم: {stats.documentsCreatedToday}</span>
                </div>
                <div className="p-3 bg-[#f7fafc] border border-[#e2e8f0] rounded text-center">
                  <span className="text-base font-bold text-emerald-700">هذا الأسبوع: {stats.documentsCreatedThisWeek}</span>
                </div>
                <div className="p-3 bg-[#f7fafc] border border-[#e2e8f0] rounded text-center">
                  <span className="text-base font-bold text-purple-700">هذا الشهر: {stats.documentsCreatedThisMonth}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Manual Backup Card */}
      <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
        <CardHeader className="p-6 border-b border-[#e2e8f0]">
          <CardTitle className="text-xl font-bold text-[#1a202c] flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282]">
              <Download className="h-5 w-5 text-[#2c5282]" />
            </div>
            <span>إنشاء نسخة احتياطية يدوية</span>
          </CardTitle>
          <CardDescription className="text-base text-[#718096]">
            إنشاء وتصدير نسخة احتياطية فورية من جميع الوثائق مع ملفات PDF
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {isBackingUp && (
            <div className="space-y-4 p-5 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2 font-bold text-[#2c5282]">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  جاري إنشاء النسخة الاحتياطية...
                </span>
                <span className="font-bold text-[#2c5282]">{backupProgress}%</span>
              </div>
              <Progress value={backupProgress} className="w-full h-3 bg-blue-100" />
            </div>
          )}

          {/* Backup Options */}
          <div className="space-y-5 p-5 bg-[#f7fafc] border border-[#e2e8f0] rounded">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="yearly-backup" className="text-base font-bold text-[#1a202c] cursor-pointer">
                  نسخة احتياطية مخصصة حسب السنة
                </Label>
                <p className="text-sm text-[#4a5568]">حصر التصدير لوثائق سنة مالية محددة</p>
              </div>
              <Switch
                id="yearly-backup"
                checked={isYearlyBackup}
                onCheckedChange={setIsYearlyBackup}
              />
            </div>
          
            {isYearlyBackup && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-[#e2e8f0]">
                <div className="space-y-2">
                  <Label htmlFor="backup-year" className="text-base font-bold text-[#1a202c]">
                    السنة المالية المستهدفة
                  </Label>
                  <Input
                    id="backup-year"
                    placeholder="مثال: 2025"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    type="number"
                    min="2000"
                    max="2035"
                    className="h-11 text-base border-[#cbd5e1] rounded bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="export-path" className="text-base font-bold text-[#1a202c]">
                    مسار مجلد التصدير
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="export-path"
                      placeholder={savedBackupPath || "/tmp/backups"}
                      value={exportPath}
                      onChange={(e) => setExportPath(e.target.value)}
                      className="h-11 text-base border-[#cbd5e1] rounded bg-white flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => saveDefaultPath(exportPath)}
                      disabled={!exportPath}
                      className="h-11 px-4 border-[#cbd5e1] text-[#2c5282] hover:bg-blue-50 rounded shrink-0"
                      title="حفظ كمسار افتراضي"
                    >
                      <FolderOpen className="h-5 w-5" />
                    </Button>
                  </div>
                  {savedBackupPath && (
                    <p className="text-sm text-gray-500">المسار الافتراضي المسجل: {savedBackupPath}</p>
                  )}
                </div>
              </div>
            )}
          
            {!isYearlyBackup && (
              <div className="space-y-2 pt-3 border-t border-[#e2e8f0]">
                <Label htmlFor="export-path-regular" className="text-base font-bold text-[#1a202c]">
                  مسار مجلد التصدير على الخادم
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="export-path-regular"
                    placeholder={savedBackupPath || "/tmp/backups"}
                    value={exportPath}
                    onChange={(e) => setExportPath(e.target.value)}
                    className="h-11 text-base border-[#cbd5e1] rounded bg-white flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => saveDefaultPath(exportPath)}
                    disabled={!exportPath}
                    className="h-11 px-4 border-[#cbd5e1] text-[#2c5282] hover:bg-blue-50 rounded shrink-0"
                    title="حفظ كمسار افتراضي"
                  >
                    <FolderOpen className="h-5 w-5" />
                  </Button>
                </div>
                {savedBackupPath && (
                  <p className="text-sm text-gray-500">المسار الافتراضي المسجل: {savedBackupPath}</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Alert className="border-blue-200 bg-blue-50 rounded">
              <CheckCircle className="h-5 w-5 text-[#2c5282]" />
              <AlertDescription className="text-base text-[#2c5282] font-medium mr-2">
                {isYearlyBackup ? 
                  `سيتم إنشاء نسخة احتياطية لوثائق عام ${selectedYear} في مجلد courrier/${selectedYear}/ مع ملفات PDF وبيانات JSON الملحقة.` :
                  'سيتم تضمين كافة الوثائق الواردة والصادرة مع ملفات PDF والمرفقات في ملف الأرشيف.'
                }
              </AlertDescription>
            </Alert>
            
            {lastBackupInfo && (
              <Alert className="border-emerald-200 bg-emerald-50 rounded">
                <Info className="h-5 w-5 text-emerald-700" />
                <AlertDescription className="text-base text-emerald-800 font-medium mr-2">
                  <strong>آخر نسخة تم إنشاؤها:</strong> {lastBackupInfo}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                className="h-11 px-8 text-base font-bold bg-[#FFCB56] hover:bg-[#FFD758] text-[#1a202c] rounded shadow-none w-full sm:w-auto"
                disabled={isBackingUp}
              >
                <Download className="h-5 w-5 ml-2 text-[#1a202c]" />
                {isBackingUp ? 'جاري الإنشاء...' : 
                 isYearlyBackup ? `إنشاء نسخة احتياطية لعام ${selectedYear}` : 'إنشاء نسخة احتياطية الآن'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 space-y-6 shadow-xl"
              dir="rtl"
            >
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl sm:text-2xl font-bold text-[#2c5282] text-right">
                  تأكيد إنشاء النسخة الاحتياطية
                </AlertDialogTitle>
                <AlertDialogDescription className="text-base text-[#4a5568] mt-2 text-right leading-relaxed">
                  {isYearlyBackup ? 
                    `هل تريد إنشاء وتصدير نسخة احتياطية لوثائق عام ${selectedYear}؟` :
                    'هل تريد إنشاء نسخة احتياطية شاملة لجميع الوثائق والمرفقات؟'
                  } قد تستغرق هذه العملية عدة دقائق بحسب حجم الملفات المرفقة.
                  
                  <div className="mt-4 space-y-2 text-right">
                    <div className="p-3 bg-[#f7fafc] rounded text-base border border-[#e2e8f0] text-[#1a202c]">
                      <strong>مسار التصدير:</strong> {exportPath || savedBackupPath || '/tmp/backups'}
                    </div>
                    {isYearlyBackup && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-base text-[#2c5282]">
                        <strong>هيكل المجلد:</strong> courrier/{selectedYear}/[Incoming-Doc, Outgoing-Doc]
                      </div>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-[#e2e8f0]">
                <AlertDialogAction 
                  onClick={handleCreateBackup}
                  className="h-11 px-7 rounded bg-[#2c5282] hover:bg-[#234269] text-white text-base font-semibold shadow-none"
                >
                  تأكيد البدء
                </AlertDialogAction>
                <AlertDialogCancel className="h-11 px-6 rounded border-[#cbd5e1] text-[#2d3748] hover:bg-gray-100 text-base font-medium">
                  إلغاء
                </AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* 4. Automatic Backup Policy */}
      <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
        <CardHeader className="p-6 border-b border-[#e2e8f0]">
          <CardTitle className="text-xl font-bold text-[#1a202c] flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282]">
              <Settings className="h-5 w-5 text-[#2c5282]" />
            </div>
            <span>النسخ الاحتياطي التلقائي المجدول</span>
          </CardTitle>
          <CardDescription className="text-base text-[#718096]">
            تكوين جدولة دورية لإنشاء النسخ الاحتياطية تلقائياً مع ملفات PDF
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded">
            <div className="space-y-1">
              <Label htmlFor="enable-backup" className="text-base font-bold text-[#1a202c] cursor-pointer">
                تفعيل النسخ الاحتياطي التلقائي
              </Label>
              <p className="text-sm text-[#4a5568]">
                إنشاء نسخ احتياطية دورية بصورة آلية دون الحاجة لتدخل يدوي
              </p>
            </div>
            <Switch
              id="enable-backup"
              checked={policy.enabled}
              onCheckedChange={(checked) => setPolicy(prev => ({ ...prev, enabled: checked }))}
            />
          </div>

          {policy.enabled && (
            <div className="space-y-5 p-5 bg-[#f7fafc] border border-[#e2e8f0] rounded">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="frequency" className="text-base font-bold text-[#1a202c]">
                    تكرار النسخ الاحتياطي
                  </Label>
                  <Select value={policy.frequency} onValueChange={(value: BackupPolicy['frequency']) => setPolicy(prev => ({ ...prev, frequency: value }))}>
                    <SelectTrigger id="frequency" className="h-11 text-base border-[#cbd5e1] rounded bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">يومياً (منتصف الليل)</SelectItem>
                      <SelectItem value="weekly">أسبوعياً (نهاية الأسبوع)</SelectItem>
                      <SelectItem value="monthly">شهرياً (أول كل شهر)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compression" className="text-base font-bold text-[#1a202c]">
                    مستوى ضغط الملفات
                  </Label>
                  <Select value={policy.compressionLevel} onValueChange={(value: BackupPolicy['compressionLevel']) => setPolicy(prev => ({ ...prev, compressionLevel: value }))}>
                    <SelectTrigger id="compression" className="h-11 text-base border-[#cbd5e1] rounded bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفض (سريع)</SelectItem>
                      <SelectItem value="medium">متوسط (موصى به للأداء المتوازن)</SelectItem>
                      <SelectItem value="high">عالي (حجم أصغر على القرص)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-[#e2e8f0]">
                <div className="flex items-center justify-between p-3 bg-white border border-[#e2e8f0] rounded">
                  <div className="space-y-0.5">
                    <Label htmlFor="include-attachments" className="text-base font-bold text-[#1a202c] cursor-pointer">
                      تضمين المرفقات والـ PDF
                    </Label>
                    <p className="text-xs text-gray-500">
                      نسخ ملفات المستندات والمرفقات كاملة
                    </p>
                  </div>
                  <Switch
                    id="include-attachments"
                    checked={policy.includeAttachments}
                    onCheckedChange={(checked) => setPolicy(prev => ({ ...prev, includeAttachments: checked }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retention" className="text-base font-bold text-[#1a202c]">
                    فترة الاحتفاظ بالنسخ (بالأيام)
                  </Label>
                  <Input
                    id="retention"
                    type="number"
                    min="1"
                    max="365"
                    value={policy.retentionDays}
                    onChange={(e) => setPolicy(prev => ({ ...prev, retentionDays: parseInt(e.target.value) || 30 }))}
                    className="h-11 text-base border-[#cbd5e1] rounded bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          <Alert className="border-amber-300 bg-amber-50 rounded">
            <AlertTriangle className="h-5 w-5 text-amber-700" />
            <AlertDescription className="text-base text-amber-900 font-medium mr-2">
              سيتم إنشاء نسخة احتياطية {getFrequencyLabel(policy.frequency)} {policy.includeAttachments ? 'مع المرفقات وملفات PDF' : 'بدون المرفقات'} 
              والاحتفاظ بها لمدة {policy.retentionDays} يوم.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end pt-2">
            <Button 
              onClick={handleSavePolicy} 
              disabled={loading} 
              className="h-11 px-8 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded shadow-none"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ إعدادات الجدولة'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupSettingsPage;
