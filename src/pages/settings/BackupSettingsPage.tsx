import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Database, 
  Settings, 
  Download, 
  Upload,
  FileText,
  Calendar,
  Archive,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  FolderOpen,
  Info,
  Shield,
  Clock,
  Zap
} from 'lucide-react';
import { backupService, BackupStats, BackupPolicy } from '@/services/backupService';
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
} from "@/components/ui/alert-dialog";


const BackupSettingsPage = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [policy, setPolicy] = useState<BackupPolicy>({
    enabled: false,
    frequency: 'weekly',
    includeAttachments: true,
    compressionLevel: 'medium',
    retentionDays: 30
  });
  const [loading, setLoading] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [currentBackupId, setCurrentBackupId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [exportPath, setExportPath] = useState<string>('');
  const [isYearlyBackup, setIsYearlyBackup] = useState(false);
  const [savedBackupPath, setSavedBackupPath] = useState<string>('');
  const [lastBackupInfo, setLastBackupInfo] = useState<string>('');

  useEffect(() => {
    loadData();
    loadPolicy();
    loadSavedSettings();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const statsData = await backupService.getBackupStats();
      setStats(statsData);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "خطأ في تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPolicy = async () => {
    try {
      const policyData = await backupService.getBackupPolicy();
      setPolicy(policyData);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "خطأ في تحميل إعدادات النسخ الاحتياطي",
        variant: "destructive",
      });
    }
  };

  const loadSavedSettings = () => {
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
      
      // Save the export path as default if provided
      if (exportPath && exportPath.trim()) {
        saveDefaultPath(exportPath.trim());
      }

      const response = await backupService.createBackup(
        isYearlyBackup ? parseInt(selectedYear) : undefined,
        exportPath || undefined
      );
      setCurrentBackupId(response.backupId);
      
      // Poll backup status
      const pollStatus = async () => {
        try {
          const status = await backupService.getBackupStatus(response.backupId);
          
          if (status.status === 'completed') {
            setBackupProgress(100);
            setIsBackingUp(false);
            setCurrentBackupId(null);
            
            // Create detailed success message with actual file path
            const actualPath = status.filePath || exportPath || '/tmp/backups';
            const successMessage = isYearlyBackup ? 
              `تم إنشاء النسخة الاحتياطية لعام ${selectedYear} بنجاح` : 
              `تم إنشاء النسخة الاحتياطية بنجاح`;
            
            const fullMessage = `${successMessage} - المحفوظة في: ${actualPath}`;
            setLastBackupInfo(fullMessage);
            
            toast({
              title: "نجح",
              description: `${successMessage} - المحفوظة في: ${actualPath}`,
            });
            loadData(); // Refresh stats
          } else if (status.status === 'failed') {
            setIsBackingUp(false);
            setCurrentBackupId(null);
            toast({
              title: "خطأ",
              description: `خطأ في إنشاء النسخة الاحتياطية: ${status.errorMessage || 'خطأ غير معروف'}`,
              variant: "destructive",
            });
          } else {
            // Still in progress, continue polling
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
      
      // Start polling after a short delay
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

  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 10; i--) {
      years.push(i);
    }
    return years;
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'يومياً';
      case 'weekly': return 'أسبوعياً';
      case 'monthly': return 'شهرياً';
      default: return frequency;
    }
  };

  const getCompressionLabel = (level: string) => {
    switch (level) {
      case 'low': return 'منخفض';
      case 'medium': return 'متوسط';
      case 'high': return 'عالي';
      default: return level;
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground text-responsive-sm">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive min-h-screen bg-background" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 padding-responsive animate-fade-in-up">
        {/* Enhanced Header */}
        <div className="flex items-center gap-4 padding-responsive-sm bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-border/50">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              النسخ الاحتياطي للبيانات
            </h1>
            <p className="text-muted-foreground text-responsive-sm mt-1">
              إدارة وحماية الوثائق الواردة والصادرة مع ملفات PDF
            </p>
          </div>
        </div>

        {/* Enhanced Statistics Card */}
        {stats && (
          <Card className="enhanced-card border-border/50 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-accent/20 rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-responsive-lg">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Archive className="h-6 w-6 text-primary" />
                </div>
                إحصائيات البيانات
              </CardTitle>
              <CardDescription className="text-responsive-sm">
                نظرة عامة على البيانات المتاحة للنسخ الاحتياطي
              </CardDescription>
            </CardHeader>
            <CardContent className="padding-responsive">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-xl border border-blue-200/50 enhanced-card">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg w-fit mx-auto mb-3">
                    <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.totalIncomingDocuments}</div>
                  <div className="text-responsive-xs text-blue-600/80 dark:text-blue-400/80 font-medium">الوثائق الواردة</div>
                </div>
                <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-xl border border-green-200/50 enhanced-card">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg w-fit mx-auto mb-3">
                    <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-300">{stats.totalOutgoingDocuments}</div>
                  <div className="text-responsive-xs text-green-600/80 dark:text-green-400/80 font-medium">الوثائق الصادرة</div>
                </div>
                <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 rounded-xl border border-purple-200/50 enhanced-card">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg w-fit mx-auto mb-3">
                    <HardDrive className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-purple-700 dark:text-purple-300">{stats.totalFileSize}</div>
                  <div className="text-responsive-xs text-purple-600/80 dark:text-purple-400/80 font-medium">إجمالي حجم البيانات</div>
                </div>
                <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 rounded-xl border border-orange-200/50 enhanced-card">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg w-fit mx-auto mb-3">
                    <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-orange-700 dark:text-orange-300">
                    {stats.lastBackupDate ? new Date(stats.lastBackupDate).toLocaleDateString('ar') : 'لا توجد'}
                  </div>
                  <div className="text-responsive-xs text-orange-600/80 dark:text-orange-400/80 font-medium">آخر نسخة احتياطية</div>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div className="space-y-4">
                <h4 className="font-semibold text-responsive-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  إحصائيات إنشاء الوثائق
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Badge variant="secondary" className="justify-center p-3 text-responsive-xs">
                    <Zap className="h-3 w-3 ml-1" />
                    اليوم: {stats.documentsCreatedToday}
                  </Badge>
                  <Badge variant="secondary" className="justify-center p-3 text-responsive-xs">
                    <Calendar className="h-3 w-3 ml-1" />
                    هذا الأسبوع: {stats.documentsCreatedThisWeek}
                  </Badge>
                  <Badge variant="secondary" className="justify-center p-3 text-responsive-xs">
                    <Archive className="h-3 w-3 ml-1" />
                    هذا الشهر: {stats.documentsCreatedThisMonth}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Manual Backup */}
        <Card className="enhanced-card border-border/50 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-responsive-lg">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Download className="h-6 w-6 text-primary" />
              </div>
              إنشاء نسخة احتياطية يدوية
            </CardTitle>
            <CardDescription className="text-responsive-sm">
              إنشاء نسخة احتياطية فورية من جميع الوثائق مع ملفات PDF
            </CardDescription>
          </CardHeader>
          <CardContent className="padding-responsive space-y-6">
            {isBackingUp && (
              <div className="space-y-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-center justify-between text-responsive-sm">
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                    جاري إنشاء النسخة الاحتياطية...
                  </span>
                  <span className="font-bold text-primary">{backupProgress}%</span>
                </div>
                <Progress value={backupProgress} className="w-full h-3" />
              </div>
            )}

            {/* Enhanced Backup Type Selection */}
            <div className="space-y-6 p-6 bg-gradient-to-br from-muted/30 to-accent/20 rounded-xl border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <Label htmlFor="yearly-backup" className="text-responsive-base font-semibold">نسخة احتياطية حسب السنة</Label>
                    <p className="text-responsive-xs text-muted-foreground">تحديد عام محدد للنسخ الاحتياطي</p>
                  </div>
                </div>
                <Switch
                  id="yearly-backup"
                  checked={isYearlyBackup}
                  onCheckedChange={setIsYearlyBackup}
                />
              </div>
            
            {isYearlyBackup && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <Label htmlFor="backup-year">السنة</Label>
                   <Input
                     id="backup-year"
                     placeholder="أدخل السنة (مثال: 2025)"
                     value={selectedYear}
                     onChange={(e) => setSelectedYear(e.target.value)}
                     type="number"
                     min="2000"
                     max="2030"
                     className="w-full"
                   />
                 </div>
                 <div>
                   <Label htmlFor="export-path">مسار التصدير</Label>
                   <div className="space-y-2">
                     <div className="flex space-x-2">
                       <Input
                         id="export-path"
                         placeholder={savedBackupPath || "/path/to/backup/directory"}
                         value={exportPath}
                         onChange={(e) => setExportPath(e.target.value)}
                         className="flex-1"
                       />
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={() => saveDefaultPath(exportPath)}
                         disabled={!exportPath}
                       >
                         <FolderOpen className="h-4 w-4" />
                       </Button>
                     </div>
                     {savedBackupPath && (
                       <p className="text-xs text-muted-foreground">
                         المسار الافتراضي: {savedBackupPath}
                       </p>
                     )}
                   </div>
                 </div>
              </div>
            )}
            
            {!isYearlyBackup && (
              <div>
                <Label htmlFor="export-path-regular">مسار التصدير</Label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      id="export-path-regular"
                      placeholder={savedBackupPath || "/path/to/backup/directory"}
                      value={exportPath}
                      onChange={(e) => setExportPath(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => saveDefaultPath(exportPath)}
                      disabled={!exportPath}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                  {savedBackupPath && (
                    <p className="text-xs text-muted-foreground">
                      المسار الافتراضي: {savedBackupPath}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Alert className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-responsive-sm text-green-800 dark:text-green-300">
                {isYearlyBackup ? 
                  `سيتم إنشاء نسخة احتياطية لوثائق عام ${selectedYear} في هيكل مجلدات courrier/${selectedYear}/Incoming-Doc و courrier/${selectedYear}/Outgoing-Doc مع ملفات PDF وملفات JSON للبيانات التفصيلية.` :
                  'سيتم تضمين جميع الوثائق الواردة والصادرة مع ملفات PDF ومرفقاتها في النسخة الاحتياطية.'
                }
              </AlertDescription>
            </Alert>
            
            {lastBackupInfo && (
              <Alert className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
                <Info className="h-5 w-5 text-emerald-600" />
                <AlertDescription className="text-responsive-sm text-emerald-800 dark:text-emerald-300">
                  <strong>آخر نسخة احتياطية:</strong> {lastBackupInfo}
                </AlertDescription>
              </Alert>
            )}
          </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full professional-button touch-target" disabled={isBackingUp}>
                  <Download className="h-5 w-5 ml-2" />
                  {isBackingUp ? 'جاري الإنشاء...' : 
                   isYearlyBackup ? `إنشاء نسخة احتياطية لعام ${selectedYear}` : 'إنشاء نسخة احتياطية الآن'}
                </Button>
              </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl sm:text-2xl font-bold text-[#2c5282] text-right">تأكيد إنشاء النسخة الاحتياطية</AlertDialogTitle>
                <AlertDialogDescription className="text-base text-gray-700 mt-2 text-right leading-relaxed">
                  {isYearlyBackup ? 
                    `هل تريد إنشاء نسخة احتياطية لوثائق عام ${selectedYear}؟` :
                    'هل تريد إنشاء نسخة احتياطية من جميع الوثائق؟'
                  } قد تستغرق هذه العملية عدة دقائق حسب حجم البيانات.
                  <div className="mt-4 space-y-2 text-right">
                    <div className="p-3 bg-muted rounded text-base border border-[#e2e8f0]">
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
              <AlertDialogFooter className="flex flex-row-reverse justify-start gap-3 mt-4 pt-4 border-t border-[#e2e8f0]">
                <AlertDialogAction 
                  onClick={handleCreateBackup}
                  className="h-11 px-7 rounded bg-[#2c5282] hover:bg-[#234269] text-white text-base font-semibold shadow-none"
                >
                  إنشاء نسخة احتياطية
                </AlertDialogAction>
                <AlertDialogCancel className="h-11 px-6 rounded border-[#cbd5e1] text-gray-700 hover:bg-gray-100 text-base font-medium">
                  إلغاء
                </AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

        {/* Enhanced Automatic Backup Policy */}
        <Card className="enhanced-card border-border/50 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-secondary/20 to-accent/20 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-responsive-lg">
              <div className="p-2 bg-secondary/20 rounded-lg">
                <Settings className="h-6 w-6 text-secondary-foreground" />
              </div>
              النسخ الاحتياطي التلقائي
            </CardTitle>
            <CardDescription className="text-responsive-sm">
              تكوين إنشاء النسخ الاحتياطية تلقائياً حسب جدولة محددة مع ملفات PDF
            </CardDescription>
          </CardHeader>
          <CardContent className="padding-responsive space-y-6">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/30 to-accent/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Label htmlFor="enable-backup" className="text-responsive-base font-semibold">
                    تفعيل النسخ الاحتياطي التلقائي
                  </Label>
                  <p className="text-responsive-xs text-muted-foreground">
                    إنشاء نسخ احتياطية تلقائياً حسب التوقيت المحدد
                  </p>
                </div>
              </div>
              <Switch
                id="enable-backup"
                checked={policy.enabled}
                onCheckedChange={(checked) => setPolicy(prev => ({ ...prev, enabled: checked }))}
              />
            </div>

            {policy.enabled && (
              <div className="space-y-6 p-6 bg-gradient-to-br from-muted/30 to-accent/20 rounded-xl border border-border/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="frequency">تكرار النسخ الاحتياطي</Label>
                  <Select value={policy.frequency} onValueChange={(value) => setPolicy(prev => ({ ...prev, frequency: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">يومياً</SelectItem>
                      <SelectItem value="weekly">أسبوعياً</SelectItem>
                      <SelectItem value="monthly">شهرياً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="compression">مستوى الضغط</Label>
                  <Select value={policy.compressionLevel} onValueChange={(value) => setPolicy(prev => ({ ...prev, compressionLevel: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفض (سريع)</SelectItem>
                      <SelectItem value="medium">متوسط (موصى به)</SelectItem>
                      <SelectItem value="high">عالي (حجم أصغر)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="include-attachments" className="text-sm font-medium">
                      تضمين المرفقات
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      نسخ احتياطي من ملفات المرفقات
                    </p>
                  </div>
                  <Switch
                    id="include-attachments"
                    checked={policy.includeAttachments}
                    onCheckedChange={(checked) => setPolicy(prev => ({ ...prev, includeAttachments: checked }))}
                  />
                </div>
                <div>
                  <Label htmlFor="retention">الاحتفاظ (أيام)</Label>
                  <Input
                    id="retention"
                    type="number"
                    min="1"
                    max="365"
                    value={policy.retentionDays}
                    onChange={(e) => setPolicy(prev => ({ ...prev, retentionDays: parseInt(e.target.value) || 30 }))}
                  />
                </div>
              </div>
            </div>
          )}

            <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-responsive-sm text-amber-800 dark:text-amber-300">
                سيتم إنشاء نسخة احتياطية {getFrequencyLabel(policy.frequency)} {policy.includeAttachments ? 'مع المرفقات وملفات PDF' : 'بدون المرفقات'} 
                والاحتفاظ بها لمدة {policy.retentionDays} يوم.
              </AlertDescription>
            </Alert>

            <Button onClick={handleSavePolicy} disabled={loading} className="professional-button w-full sm:w-auto touch-target">
              {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
        </CardContent>
      </Card>

        {/* Enhanced Restore Options */}
        <Card className="enhanced-card border-border/50 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-responsive-lg text-blue-700 dark:text-blue-300">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              استعادة البيانات
            </CardTitle>
            <CardDescription className="text-responsive-sm">
              استعادة البيانات من نسخة احتياطية محفوظة مع ملفات PDF
            </CardDescription>
          </CardHeader>
          <CardContent className="padding-responsive space-y-6">
            <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-responsive-sm text-blue-800 dark:text-blue-300">
                يمكنك استعادة البيانات من النسخ الاحتياطية المحفوظة محلياً أو من التخزين السحابي مع جميع ملفات PDF.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Button variant="outline" className="h-auto flex-col py-6 enhanced-card touch-target border-dashed border-2 hover:border-solid hover:border-primary">
                <Upload className="h-8 w-8 mb-3 text-primary" />
                <span className="font-semibold text-responsive-base">رفع نسخة احتياطية</span>
                <span className="text-responsive-xs text-muted-foreground text-center">استعادة من ملف محلي مع ملفات PDF</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col py-6 enhanced-card touch-target border-dashed border-2" disabled>
                <Database className="h-8 w-8 mb-3 text-muted-foreground" />
                <span className="font-semibold text-responsive-base">استعادة من السحابة</span>
                <span className="text-responsive-xs text-muted-foreground text-center">قريباً - مع دعم ملفات PDF</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BackupSettingsPage;