import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Archive,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Database,
  Download,
  FileText,
  Filter,
  FolderOpen,
  HardDrive,
  Info,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import {
  BackupHistoryItem,
  BackupPolicy,
  BackupStats,
  backupService,
  deleteBackup,
  downloadBackup,
  getBackupHistory,
  reloadBackupScheduler,
  restoreBackup,
} from '@/services/backupService';
import { RestoreBackupDialog } from '@/components/backup/RestoreBackupDialog';
import { formatDateTime, formatLongDate } from '@/utils/formatDate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface BackupManagementPanelProps {
  standalone?: boolean;
}

export const BackupManagementPanel: React.FC<BackupManagementPanelProps> = ({
  standalone = false,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { dir } = useDirection();
  const isRTL = language !== 'fr';

  const [stats, setStats] = useState<BackupStats | null>(null);
  const [policy, setPolicy] = useState<BackupPolicy>({
    enabled: false,
    frequency: 'daily',
    retentionDays: 30,
    includeAttachments: true,
    compressionLevel: 'medium',
  });
  const [loading, setLoading] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [isYearlyBackup, setIsYearlyBackup] = useState(false);
  const [exportPath, setExportPath] = useState<string>('');
  const [savedBackupPath, setSavedBackupPath] = useState<string>('');
  const [lastBackupInfo, setLastBackupInfo] = useState<string | null>(null);

  const [backupHistory, setBackupHistory] = useState<BackupHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupHistoryItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<BackupHistoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'manual' | 'automatic'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'failed'>('all');

  useEffect(() => {
    loadData();
    loadSavedPath();
    loadBackupHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getErrorMessage = (error: unknown) => {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    return err?.response?.data?.message || err?.message || (isRTL ? 'خطأ غير معروف' : 'Erreur inconnue');
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, policyData] = await Promise.all([
        backupService.getBackupStats(),
        backupService.getBackupPolicy(),
      ]);
      setStats(statsData);
      setPolicy(policyData);
    } catch {
      toast.error(isRTL ? 'خطأ في تحميل بيانات النسخ الاحتياطي' : 'Erreur lors du chargement des données de sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const loadBackupHistory = async () => {
    setHistoryLoading(true);
    try {
      const history = await getBackupHistory();
      const list = Array.isArray(history)
        ? history
        : ((history as { data?: BackupHistoryItem[] })?.data || []);
      setBackupHistory(list as BackupHistoryItem[]);
    } catch (error) {
      console.error(error);
    } finally {
      setHistoryLoading(false);
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
    const trimmed = path.trim();
    if (!trimmed) return;
    localStorage.setItem('backup_default_path', trimmed);
    setSavedBackupPath(trimmed);
    toast.success(isRTL ? 'تم حفظ المسار الافتراضي بنجاح' : 'Chemin par défaut enregistré');
  };

  const handleSavePolicy = async () => {
    try {
      setSavingPolicy(true);
      await backupService.updateBackupPolicy(policy);
      toast.success(isRTL ? 'تم حفظ إعدادات الجدولة بنجاح' : 'Planification enregistrée avec succès');
    } catch {
      toast.error(isRTL ? 'تعذر حفظ إعدادات الجدولة' : 'Erreur lors de l’enregistrement');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleReloadScheduler = async () => {
    try {
      await reloadBackupScheduler();
      toast.success(isRTL ? 'تمت إعادة تحميل الجدول الزمني' : 'Planificateur rechargé');
    } catch (error) {
      toast.error(isRTL ? 'خطأ' : 'Erreur', { description: getErrorMessage(error) });
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsBackingUp(true);
      setBackupProgress(5);

      if (exportPath && exportPath.trim()) {
        saveDefaultPath(exportPath.trim());
      }

      const response = await backupService.createBackup(
        isYearlyBackup ? parseInt(selectedYear, 10) : undefined,
        exportPath.trim() || undefined
      );

      const pollStatus = async () => {
        try {
          const status = await backupService.getBackupStatus(response.backupId);
          if (status.status === 'completed') {
            setBackupProgress(100);
            setIsBackingUp(false);

            const actualPath = status.filePath || exportPath || 'backups/';
            const successMessage = isYearlyBackup
              ? isRTL
                ? `تم إنشاء النسخة الاحتياطية لعام ${selectedYear} بنجاح`
                : `Sauvegarde de l'année ${selectedYear} créée`
              : isRTL
                ? 'تم إنشاء النسخة الاحتياطية بنجاح'
                : 'Sauvegarde créée avec succès';

            const fullMessage = isRTL
              ? `${successMessage} — المسار: ${actualPath}`
              : `${successMessage} — Chemin : ${actualPath}`;
            setLastBackupInfo(fullMessage);
            toast.success(fullMessage);
            loadData();
            loadBackupHistory();
          } else if (status.status === 'failed') {
            setIsBackingUp(false);
            toast.error(
              isRTL
                ? `فشل إنشاء النسخة الاحتياطية: ${status.errorMessage || 'خطأ غير معروف'}`
                : `Échec de la sauvegarde : ${status.errorMessage || 'Erreur inconnue'}`
            );
          } else {
            setBackupProgress((prev) => Math.min(prev + 12, 90));
            setTimeout(pollStatus, 2000);
          }
        } catch {
          setIsBackingUp(false);
          toast.error(
            isRTL ? 'خطأ في متابعة حالة النسخة الاحتياطية' : 'Erreur lors du suivi de la sauvegarde'
          );
        }
      };

      setTimeout(pollStatus, 2000);
    } catch {
      toast.error(isRTL ? 'تعذر إنشاء النسخة الاحتياطية' : 'Impossible de créer la sauvegarde');
      setIsBackingUp(false);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!selectedBackup?._id) return;
    setIsRestoring(true);
    try {
      await restoreBackup(selectedBackup._id);
      toast.success(isRTL ? 'تمت الاستعادة بنجاح' : 'Restauration terminée avec succès');
      setRestoreDialogOpen(false);
      setSelectedBackup(null);
      loadBackupHistory();
      loadData();
    } catch (error) {
      toast.error(isRTL ? 'فشل الاستعادة' : 'Échec de la restauration', {
        description: getErrorMessage(error),
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDownloadClick = async (backup: BackupHistoryItem) => {
    try {
      await downloadBackup(backup._id, backup.fileName);
      toast.success(isRTL ? 'بدأ التحميل' : 'Téléchargement démarré');
    } catch (error) {
      toast.error(isRTL ? 'فشل التحميل' : 'Échec du téléchargement', {
        description: getErrorMessage(error),
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!backupToDelete?._id) return;
    setIsDeleting(true);
    try {
      await deleteBackup(backupToDelete._id);
      toast.success(isRTL ? 'تم حذف النسخة الاحتياطية' : 'Sauvegarde supprimée');
      setBackupToDelete(null);
      loadBackupHistory();
    } catch (error) {
      toast.error(isRTL ? 'فشل الحذف' : 'Échec de la suppression', {
        description: getErrorMessage(error),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const getFrequencyLabel = (frequency: string) => {
    if (isRTL) {
      switch (frequency) {
        case 'daily':
          return 'يومياً';
        case 'weekly':
          return 'أسبوعياً';
        case 'monthly':
          return 'شهرياً';
        default:
          return frequency;
      }
    }
    switch (frequency) {
      case 'daily':
        return 'quotidienne';
      case 'weekly':
        return 'hebdomadaire';
      case 'monthly':
        return 'mensuelle';
      default:
        return frequency;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return (
        <Badge className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 gap-1 font-medium">
          <CheckCircle2 className="w-3 h-3" />
          <span>{isRTL ? 'مكتمل' : 'Terminée'}</span>
        </Badge>
      );
    }
    if (status === 'failed') {
      return (
        <Badge className="bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 gap-1 font-medium">
          <XCircle className="w-3 h-3" />
          <span>{isRTL ? 'فشل' : 'Échec'}</span>
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 gap-1 font-medium">
        <Clock className="w-3 h-3" />
        <span>{isRTL ? 'جاري' : 'En cours'}</span>
      </Badge>
    );
  };

  const filteredHistory = backupHistory.filter((item) => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });

  if (loading && !stats) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
        <RefreshCw className="h-7 w-7 animate-spin text-[#2c5282] dark:text-blue-400" />
        <p className="text-sm font-medium">
          {isRTL ? 'جاري تحميل بيانات النسخ الاحتياطي...' : 'Chargement des données de sauvegarde...'}
        </p>
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-6">
      {/* Header + Immediate Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-3">
          {standalone && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => navigate('/dashboard/organization/settings?tab=backup')}
              className="h-10 w-10 rounded-lg border-slate-300 dark:border-slate-700 text-[#2c5282] dark:text-blue-300 shrink-0"
              title={t('backup.backToSettingsAria')}
              aria-label={t('backup.backToSettingsAria')}
            >
              <ChevronLeft className="h-5 w-5 rtl-mirror" />
            </Button>
          )}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {isRTL ? 'النسخ الاحتياطي وأرشفة البيانات' : 'Sauvegardes et archivage'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {isRTL
                ? 'إنشاء نسخ احتياطية فورية، جدولة النسخ التلقائي، واستعادة الأرشيف مع ملفات PDF والمرفقات.'
                : 'Créez des sauvegardes immédiates, planifiez les exports automatiques et restaurez vos archives.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              loadData();
              loadBackupHistory();
            }}
            disabled={loading || historyLoading}
            className="h-10 px-3.5 rounded-lg border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium gap-2 whitespace-nowrap"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{isRTL ? 'تحديث' : 'Actualiser'}</span>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                disabled={isBackingUp}
                className="h-10 px-4 text-sm font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg gap-2 whitespace-nowrap"
              >
                {isBackingUp ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>
                  {isBackingUp
                    ? isRTL
                      ? 'جاري الإنشاء...'
                      : 'Création en cours...'
                    : isYearlyBackup
                      ? isRTL
                        ? `إنشاء نسخة لعام ${selectedYear}`
                        : `Sauvegarder ${selectedYear}`
                      : isRTL
                        ? 'إنشاء نسخة احتياطية الآن'
                        : 'Créer une sauvegarde'}
                </span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              dir={dir}
              className="w-[95vw] sm:max-w-[540px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
            >
              <AlertDialogHeader className="text-start">
                <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {isRTL ? 'تأكيد إنشاء النسخة الاحتياطية' : 'Confirmer la sauvegarde'}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                  {isYearlyBackup
                    ? isRTL
                      ? `سيتم إنشاء وتصدير نسخة احتياطية لوثائق عام ${selectedYear} مع المرفقات.`
                      : `Une sauvegarde des courriers de l'année ${selectedYear} va être générée.`
                    : isRTL
                      ? 'سيتم إنشاء نسخة احتياطية شاملة لجميع الوثائق والمرفقات في الأرشيف.'
                      : 'Une sauvegarde complète de tous les documents et pièces jointes va être créée.'}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  <strong>{isRTL ? 'مسار التصدير:' : 'Dossier cible :'}</strong>{' '}
                  <span dir="ltr" className="font-mono">
                    {exportPath || savedBackupPath || 'backups/'}
                  </span>
                </div>
                {isYearlyBackup && (
                  <div className="p-3 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[#2c5282] dark:text-blue-300">
                    <strong>{isRTL ? 'هيكل المجلد:' : 'Structure :'}</strong>{' '}
                    <span dir="ltr" className="font-mono">
                      courrier/{selectedYear}/[Incoming-Doc, Outgoing-Doc]
                    </span>
                  </div>
                )}
              </div>

              <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <AlertDialogCancel className="h-10 px-5 rounded-lg border-slate-300 dark:border-slate-700 text-sm">
                  {isRTL ? 'إلغاء' : 'Annuler'}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCreateBackup}
                  className="h-10 px-6 rounded-lg bg-[#2c5282] hover:bg-[#234269] text-white text-sm font-semibold"
                >
                  {isRTL ? 'تأكيد البدء' : 'Démarrer'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Live Progress & Last Backup Notice */}
      {isBackingUp && (
        <div className="space-y-2.5 p-4 rounded-lg bg-blue-50/80 dark:bg-blue-950/35 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-semibold text-[#2c5282] dark:text-blue-300">
              <RefreshCw className="h-4 w-4 animate-spin" />
              {isRTL ? 'جاري إنشاء النسخة الاحتياطية...' : 'Création de la sauvegarde en cours...'}
            </span>
            <span className="font-bold text-[#2c5282] dark:text-blue-300 tabular-nums">
              {backupProgress}%
            </span>
          </div>
          <Progress value={backupProgress} className="w-full h-2.5" />
        </div>
      )}

      {lastBackupInfo && (
        <Alert className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/35 rounded-lg">
          <Info className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          <AlertDescription className="text-sm text-emerald-900 dark:text-emerald-200 font-medium ms-2">
            {lastBackupInfo}
          </AlertDescription>
        </Alert>
      )}

      {/* Compact Storage Summary (4 Metrics) */}
      {stats && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/35">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <FileText className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
                <span>{isRTL ? 'الوثائق الواردة' : 'Courriers entrants'}</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2 tabular-nums">
                {stats.totalIncomingDocuments}
              </div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/35">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Archive className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isRTL ? 'الوثائق الصادرة' : 'Courriers sortants'}</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2 tabular-nums">
                {stats.totalOutgoingDocuments}
              </div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/35">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <HardDrive className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                <span>{isRTL ? 'إجمالي حجم البيانات' : 'Volume total'}</span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2 tabular-nums" dir="ltr">
                {stats.totalFileSize || '—'}
              </div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/35">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Calendar className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
                <span>{isRTL ? 'آخر نسخة احتياطية' : 'Dernière sauvegarde'}</span>
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2 tabular-nums">
                {stats.lastBackupDate ? (
                  <bdi dir={dir} className="tabular-nums">
                    {formatLongDate(stats.lastBackupDate, isRTL ? 'ar' : 'fr')}
                  </bdi>
                ) : isRTL ? (
                  'لا توجد بعد'
                ) : (
                  'Aucune'
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
            <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#2c5282] dark:text-blue-400" />
              {isRTL ? 'وثائق مضافة مؤخراً:' : 'Ajouts récents :'}
            </span>
            <span>
              {isRTL ? 'اليوم:' : "Aujourd'hui :"} <strong>{stats.documentsCreatedToday}</strong>
            </span>
            <span>
              {isRTL ? 'هذا الأسبوع:' : 'Cette semaine :'} <strong>{stats.documentsCreatedThisWeek}</strong>
            </span>
            <span>
              {isRTL ? 'هذا الشهر:' : 'Ce mois :'} <strong>{stats.documentsCreatedThisMonth}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Manual Backup Scope & Export Path */}
      <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="yearly-backup" className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
              {isRTL ? 'تخصيص النسخة الاحتياطية حسب السنة المالية' : 'Limiter la sauvegarde à une année'}
            </Label>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {isRTL
                ? 'حصر التصدير لوثائق سنة محددة بدلاً من الأرشيف الكامل'
                : "Exporter uniquement les courriers et PDF d'une année spécifique"}
            </p>
          </div>
          <Switch
            id="yearly-backup"
            checked={isYearlyBackup}
            onCheckedChange={setIsYearlyBackup}
          />
        </div>

        <div className={`grid grid-cols-1 ${isYearlyBackup ? 'md:grid-cols-2' : ''} gap-4 pt-4 border-t border-slate-200 dark:border-slate-800`}>
          {isYearlyBackup && (
            <div className="space-y-1.5">
              <Label htmlFor="backup-year" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isRTL ? 'السنة المستهدفة' : 'Année cible'}
              </Label>
              <Input
                id="backup-year"
                type="number"
                min="2000"
                max="2035"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 tabular-nums"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="export-path" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {isRTL ? 'مسار مجلد التصدير على الخادم' : "Dossier d'export sur le serveur"}
            </Label>
            <div className="flex gap-2">
              <Input
                id="export-path"
                dir="ltr"
                placeholder={savedBackupPath || 'backups/'}
                value={exportPath}
                onChange={(e) => setExportPath(e.target.value)}
                className="h-10 text-sm font-mono border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => saveDefaultPath(exportPath)}
                disabled={!exportPath.trim()}
                className="h-10 px-3 border-slate-300 dark:border-slate-700 text-[#2c5282] dark:text-blue-300 rounded-lg shrink-0 gap-1.5 whitespace-nowrap"
                title={t('backup.actions.savePathAria')}
                aria-label={t('backup.actions.savePathAria')}
              >
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline text-xs font-semibold">
                  {isRTL ? 'حفظ المسار' : 'Mémoriser'}
                </span>
              </Button>
            </div>
            {savedBackupPath && (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {isRTL ? 'المسار الافتراضي المسجل:' : 'Chemin mémorisé :'}{' '}
                <code dir="ltr" className="font-mono">{savedBackupPath}</code>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Automatic Scheduled Backup Policy */}
      <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <Settings className="w-4 h-4 text-[#2c5282] dark:text-blue-400 mt-1 shrink-0" />
            <div>
              <Label htmlFor="enable-backup" className="text-base font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                {isRTL ? 'النسخ الاحتياطي التلقائي المجدول' : 'Planification des sauvegardes automatiques'}
              </Label>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {isRTL
                  ? 'إنشاء نسخ احتياطية دورية تلقائياً وفق التكرار المحدد'
                  : 'Exécuter automatiquement des sauvegardes périodiques sans intervention manuelle'}
              </p>
            </div>
          </div>
          <Switch
            id="enable-backup"
            checked={policy.enabled}
            onCheckedChange={(checked) => setPolicy((prev) => ({ ...prev, enabled: checked }))}
          />
        </div>

        {policy.enabled && (
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="frequency" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isRTL ? 'التكرار' : 'Fréquence'}
                </Label>
                <Select
                  value={policy.frequency}
                  onValueChange={(value: BackupPolicy['frequency']) =>
                    setPolicy((prev) => ({ ...prev, frequency: value }))
                  }
                >
                  <SelectTrigger id="frequency" className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{isRTL ? 'يومياً (منتصف الليل)' : 'Quotidienne (minuit)'}</SelectItem>
                    <SelectItem value="weekly">{isRTL ? 'أسبوعياً (نهاية الأسبوع)' : 'Hebdomadaire'}</SelectItem>
                    <SelectItem value="monthly">{isRTL ? 'شهرياً (أول الشهر)' : 'Mensuelle'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="compression" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isRTL ? 'مستوى الضغط' : 'Compression'}
                </Label>
                <Select
                  value={policy.compressionLevel}
                  onValueChange={(value: BackupPolicy['compressionLevel']) =>
                    setPolicy((prev) => ({ ...prev, compressionLevel: value }))
                  }
                >
                  <SelectTrigger id="compression" className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{isRTL ? 'منخفض (سريع)' : 'Faible (rapide)'}</SelectItem>
                    <SelectItem value="medium">{isRTL ? 'متوسط (موصى به)' : 'Moyen (recommandé)'}</SelectItem>
                    <SelectItem value="high">{isRTL ? 'عالي (حجم أصغر)' : 'Élevé (compact)'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="retention" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isRTL ? 'الاحتفاظ بالنسخ (بالأيام)' : 'Rétention (jours)'}
                </Label>
                <Input
                  id="retention"
                  type="number"
                  min="1"
                  max="365"
                  value={policy.retentionDays}
                  onChange={(e) =>
                    setPolicy((prev) => ({ ...prev, retentionDays: parseInt(e.target.value, 10) || 30 }))
                  }
                  className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 tabular-nums"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <div>
                <Label htmlFor="include-attachments" className="text-sm font-semibold text-slate-900 dark:text-slate-100 cursor-pointer">
                  {isRTL ? 'تضمين المرفقات وملفات PDF' : 'Inclure les pièces jointes et PDF'}
                </Label>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {isRTL
                    ? 'نسخ كافة الملفات المرفقة والممسوحة ضوئياً مع قاعدة البيانات'
                    : 'Inclure les documents numérisés et pièces jointes'}
                </p>
              </div>
              <Switch
                id="include-attachments"
                checked={policy.includeAttachments}
                onCheckedChange={(checked) =>
                  setPolicy((prev) => ({ ...prev, includeAttachments: checked }))
                }
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {policy.enabled
              ? isRTL
                ? `النسخ التلقائي مفعّل (${getFrequencyLabel(policy.frequency)}) — الاحتفاظ لمدة ${policy.retentionDays} يوماً.`
                : `Planification active (${getFrequencyLabel(policy.frequency)}) — rétention ${policy.retentionDays} jours.`
              : isRTL
                ? 'النسخ التلقائي المجدول معطّل حالياً.'
                : 'La sauvegarde automatique est actuellement désactivée.'}
          </p>

          <Button
            type="button"
            onClick={handleSavePolicy}
            disabled={savingPolicy}
            className="h-10 px-5 text-sm font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg gap-2 whitespace-nowrap self-end sm:self-auto"
          >
            {savingPolicy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>
              {savingPolicy
                ? isRTL
                  ? 'جاري الحفظ...'
                  : 'Enregistrement...'
                : isRTL
                  ? 'حفظ إعدادات الجدولة'
                  : 'Enregistrer la planification'}
            </span>
          </Button>
        </div>
      </div>

      {/* Recent Backups Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-[#2c5282] dark:text-blue-400" />
              <span>{isRTL ? 'سجل النسخ الاحتياطية' : 'Historique des sauvegardes'}</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 tabular-nums">
              {isRTL
                ? `عرض ${filteredHistory.length} من أصل ${backupHistory.length} نسخة`
                : `${filteredHistory.length} sur ${backupHistory.length} sauvegardes`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <Select
                value={typeFilter}
                onValueChange={(val: 'all' | 'manual' | 'automatic') => setTypeFilter(val)}
              >
                <SelectTrigger className="h-9 min-w-[110px] text-xs border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'كل الأنواع' : 'Tous types'}</SelectItem>
                  <SelectItem value="manual">{isRTL ? 'يدوي' : 'Manuel'}</SelectItem>
                  <SelectItem value="automatic">{isRTL ? 'تلقائي' : 'Automatique'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select
              value={statusFilter}
              onValueChange={(val: 'all' | 'completed' | 'in_progress' | 'failed') =>
                setStatusFilter(val)
              }
            >
              <SelectTrigger className="h-9 min-w-[115px] text-xs border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'كل الحالات' : 'Tous statuts'}</SelectItem>
                <SelectItem value="completed">{isRTL ? 'مكتمل' : 'Terminée'}</SelectItem>
                <SelectItem value="in_progress">{isRTL ? 'جاري' : 'En cours'}</SelectItem>
                <SelectItem value="failed">{isRTL ? 'فشل' : 'Échec'}</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReloadScheduler}
              className="h-9 px-3 rounded-lg border-slate-300 dark:border-slate-700 text-xs font-semibold gap-1.5 whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isRTL ? 'إعادة تحميل الجدول' : 'Recharger CRON'}</span>
            </Button>
          </div>
        </div>

        {historyLoading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin text-[#2c5282] dark:text-blue-400" />
            <span>{isRTL ? 'جاري تحميل السجل...' : "Chargement de l'historique..."}</span>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-10 text-center text-slate-600 dark:text-slate-300">
            <HardDrive className="w-9 h-9 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {isRTL ? 'لا توجد نسخ احتياطية مطابقة' : 'Aucune sauvegarde correspondante'}
            </p>
            <p className="text-xs mt-1">
              {isRTL
                ? 'أنشئ نسخة احتياطية جديدة أو غيّر معايير التصفية'
                : 'Créez une sauvegarde ou modifiez les filtres'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/60">
                  <TableHead className="text-start font-semibold text-slate-800 dark:text-slate-200">
                    {isRTL ? 'التاريخ والوقت' : 'Date'}
                  </TableHead>
                  <TableHead className="text-start font-semibold text-slate-800 dark:text-slate-200">
                    {isRTL ? 'اسم الملف' : 'Fichier'}
                  </TableHead>
                  <TableHead className="text-start font-semibold text-slate-800 dark:text-slate-200">
                    {isRTL ? 'النوع' : 'Type'}
                  </TableHead>
                  <TableHead className="text-start font-semibold text-slate-800 dark:text-slate-200">
                    {isRTL ? 'الحالة' : 'Statut'}
                  </TableHead>
                  <TableHead className="text-start font-semibold text-slate-800 dark:text-slate-200">
                    {isRTL ? 'الحجم' : 'Taille'}
                  </TableHead>
                  <TableHead className="text-start font-semibold text-slate-800 dark:text-slate-200">
                    {isRTL ? 'الإجراءات' : 'Actions'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((backup) => (
                  <TableRow key={backup._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap tabular-nums text-slate-700 dark:text-slate-300">
                      <bdi dir={dir} className="tabular-nums">
                        {formatDateTime(backup.createdAt, isRTL ? 'ar' : 'fr')}
                      </bdi>
                    </TableCell>
                    <TableCell
                      className="text-xs sm:text-sm max-w-[220px] truncate font-mono text-slate-800 dark:text-slate-200"
                      title={backup.fileName}
                    >
                      {backup.fileName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-medium">
                        {backup.type === 'automatic'
                          ? isRTL
                            ? 'تلقائي'
                            : 'Automatique'
                          : isRTL
                            ? 'يدوي'
                            : 'Manuel'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(backup.status)}</TableCell>
                    <TableCell className="text-xs sm:text-sm font-medium tabular-nums text-slate-800 dark:text-slate-200" dir="ltr">
                      {formatFileSize(backup.fileSize)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {backup.status === 'completed' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg"
                            title={t('backup.actions.restoreAria')}
                            aria-label={t('backup.actions.restoreAria')}
                            onClick={() => {
                              setSelectedBackup(backup);
                              setRestoreDialogOpen(true);
                            }}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-[#2c5282] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg"
                          title={t('backup.actions.downloadAria')}
                          aria-label={t('backup.actions.downloadAria')}
                          onClick={() => handleDownloadClick(backup)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                          title={t('backup.actions.deleteAria')}
                          aria-label={t('backup.actions.deleteAria')}
                          onClick={() => setBackupToDelete(backup)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Restore Dialog */}
      <RestoreBackupDialog
        open={restoreDialogOpen}
        onClose={() => {
          setRestoreDialogOpen(false);
          setSelectedBackup(null);
        }}
        onConfirm={handleRestoreConfirm}
        backupInfo={
          selectedBackup
            ? {
                fileName: selectedBackup.fileName,
                createdAt: selectedBackup.createdAt,
                fileSize: selectedBackup.fileSize,
              }
            : undefined
        }
        isLoading={isRestoring}
      />

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog
        open={!!backupToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setBackupToDelete(null);
          }
        }}
      >
        <AlertDialogContent dir={dir} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">
              {isRTL ? 'تأكيد حذف النسخة الاحتياطية' : 'Supprimer la sauvegarde'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300">
              {isRTL
                ? `هل أنت متأكد من حذف النسخة "${backupToDelete?.fileName}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Voulez-vous supprimer définitivement "${backupToDelete?.fileName}" ? Cette action est irréversible.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-lg">
              {isRTL ? 'إلغاء' : 'Annuler'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              {isDeleting
                ? isRTL
                  ? 'جاري الحذف...'
                  : 'Suppression...'
                : isRTL
                  ? 'حذف نهائياً'
                  : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BackupManagementPanel;
