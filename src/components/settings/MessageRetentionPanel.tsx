import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  Clock,
  Database,
  FileText,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import {
  MessagesStats,
  RetentionPolicy,
  deleteMessagesByPeriod,
  getMessagesStats,
  getRetentionPolicy,
  setRetentionPolicy,
} from '@/services/messageSettingsService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface MessageRetentionPanelProps {
  standalone?: boolean;
  onOpenBackup?: () => void;
}

export const MessageRetentionPanel: React.FC<MessageRetentionPanelProps> = ({
  standalone = false,
  onOpenBackup,
}) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { dir } = useDirection();
  const isRTL = language !== 'fr';

  const [policy, setPolicy] = useState<RetentionPolicy>({
    enabled: false,
    period: 6,
    unit: 'months',
  });
  const [stats, setStats] = useState<MessagesStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteForm, setDeleteForm] = useState({
    period: 3,
    unit: 'months' as 'days' | 'months' | 'years',
  });
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [policyData, statsData] = await Promise.all([
        getRetentionPolicy(),
        getMessagesStats(),
      ]);
      setPolicy(policyData);
      setStats(statsData);
    } catch {
      toast.error(isRTL ? 'خطأ في تحميل بيانات الرسائل' : 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async () => {
    try {
      setSavingPolicy(true);
      await setRetentionPolicy(policy);
      toast.success(isRTL ? 'تم حفظ سياسة الاحتفاظ بنجاح' : 'Politique de rétention enregistrée');
    } catch {
      toast.error(isRTL ? 'تعذر حفظ سياسة الاحتفاظ' : "Impossible d'enregistrer la politique");
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleDeleteMessages = async () => {
    try {
      setDeleting(true);
      setIsConfirmDeleteOpen(false);
      const result = await deleteMessagesByPeriod(deleteForm.period, deleteForm.unit);
      toast.success(
        isRTL
          ? `تم حذف ${result.deletedCount} رسالة و ${result.deletedAttachments} مرفق بنجاح`
          : `${result.deletedCount} messages et ${result.deletedAttachments} pièces jointes supprimés`
      );
      await loadData();
    } catch {
      toast.error(isRTL ? 'خطأ في حذف الرسائل' : 'Erreur lors de la suppression des messages');
    } finally {
      setDeleting(false);
    }
  };

  const formatUnit = (unit: 'days' | 'months' | 'years') => {
    if (isRTL) {
      return unit === 'days' ? 'أيام' : unit === 'months' ? 'أشهر' : 'سنوات';
    }
    return unit === 'days' ? 'jours' : unit === 'months' ? 'mois' : 'ans';
  };

  const estimatedEligibleCount = (() => {
    if (!stats?.messagesByAge) return 0;
    const { totalMessages, messagesByAge } = stats;
    if (deleteForm.unit === 'years' && deleteForm.period >= 1) {
      return messagesByAge.olderThanYear;
    }
    if (deleteForm.unit === 'months') {
      if (deleteForm.period >= 12) return messagesByAge.olderThanYear;
      if (deleteForm.period >= 6) return Math.max(0, totalMessages - messagesByAge.lastSixMonths);
      if (deleteForm.period >= 3) return Math.max(0, totalMessages - messagesByAge.lastThreeMonths);
      return Math.max(0, totalMessages - messagesByAge.lastMonth);
    }
    if (deleteForm.period >= 365) return messagesByAge.olderThanYear;
    if (deleteForm.period >= 180) return Math.max(0, totalMessages - messagesByAge.lastSixMonths);
    if (deleteForm.period >= 90) return Math.max(0, totalMessages - messagesByAge.lastThreeMonths);
    return Math.max(0, totalMessages - messagesByAge.lastMonth);
  })();

  const handleBackupFirst = () => {
    if (onOpenBackup) {
      onOpenBackup();
      return;
    }
    navigate('/dashboard/organization/settings?tab=backup');
  };

  if (loading && !stats) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
        <RefreshCw className="h-7 w-7 animate-spin text-[#2c5282] dark:text-blue-400" />
        <p className="text-sm font-medium">
          {isRTL ? 'جاري تحميل بيانات وسياسات الرسائل...' : 'Chargement des statistiques de messagerie...'}
        </p>
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-3">
          {standalone && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => navigate('/dashboard/organization/settings?tab=retention')}
              className="h-10 w-10 rounded-lg border-slate-300 dark:border-slate-700 text-[#2c5282] dark:text-blue-300 shrink-0"
              title={isRTL ? 'العودة للإعدادات' : 'Retour aux paramètres'}
              aria-label={isRTL ? 'العودة للإعدادات' : 'Retour aux paramètres'}
            >
              <ChevronLeft className="h-5 w-5 rtl-mirror" />
            </Button>
          )}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {isRTL ? 'حفظ الرسائل والأرشفة' : 'Rétention et purge des messages'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {isRTL
                ? 'ضبط سياسة الاحتفاظ التلقائي، متابعة توزيع المراسلات الداخلية، والتنظيف الآمن للرسائل القديمة.'
                : 'Configurez la rétention automatique, suivez le volume de messagerie et purgez les anciens messages.'}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={loadData}
          disabled={loading}
          className="h-10 px-3.5 rounded-lg border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium gap-2 whitespace-nowrap shrink-0 self-start sm:self-center"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{isRTL ? 'تحديث البيانات' : 'Actualiser'}</span>
        </Button>
      </div>

      {/* Overview Metrics + Age Distribution */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/35">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Mail className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
              <span>{isRTL ? 'إجمالي المراسلات الداخلية' : 'Total des messages'}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2 tabular-nums">
              {stats?.totalMessages ?? 0}
            </div>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/35">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isRTL ? 'إجمالي المرفقات' : 'Pièces jointes'}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2 tabular-nums">
              {stats?.totalAttachments ?? 0}
            </div>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/35">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Clock className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
              <span>{isRTL ? 'الحذف التلقائي' : 'Purge automatique'}</span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-2 tabular-nums">
              {policy.enabled
                ? isRTL
                  ? `مفعّل (${policy.period} ${formatUnit(policy.unit)})`
                  : `Actif (${policy.period} ${formatUnit(policy.unit)})`
                : isRTL
                  ? 'معطّل (حفظ دائم)'
                  : 'Désactivé (conservation permanente)'}
            </div>
          </div>
        </div>

        {/* Age Distribution */}
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            <TrendingUp className="w-4 h-4 text-[#2c5282] dark:text-blue-400" />
            <span>{isRTL ? 'توزيع الرسائل حسب العمر' : 'Répartition par ancienneté'}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center">
              <div className="text-xl font-bold text-[#2c5282] dark:text-blue-400 tabular-nums">
                {stats?.messagesByAge?.lastMonth ?? 0}
              </div>
              <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                {isRTL ? 'آخر شهر' : 'Dernier mois'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center">
              <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {stats?.messagesByAge?.lastThreeMonths ?? 0}
              </div>
              <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                {isRTL ? 'آخر 3 أشهر' : '3 derniers mois'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center">
              <div className="text-xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                {stats?.messagesByAge?.lastSixMonths ?? 0}
              </div>
              <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                {isRTL ? 'آخر 6 أشهر' : '6 derniers mois'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center">
              <div className="text-xl font-bold text-orange-700 dark:text-orange-400 tabular-nums">
                {stats?.messagesByAge?.lastYear ?? 0}
              </div>
              <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                {isRTL ? 'آخر سنة' : 'Dernière année'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center col-span-2 sm:col-span-1">
              <div className="text-xl font-bold text-red-700 dark:text-red-400 tabular-nums">
                {stats?.messagesByAge?.olderThanYear ?? 0}
              </div>
              <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                {isRTL ? 'أقدم من سنة' : '+ d’un an'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Automatic Retention Policy */}
      <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-[#2c5282] dark:text-blue-400 mt-1 shrink-0" />
            <div>
              <Label htmlFor="enable-retention" className="text-base font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                {isRTL ? 'سياسة الحفظ التلقائي للمراسلات' : 'Politique de conservation automatique'}
              </Label>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {isRTL
                  ? 'حذف المراسلات والمرفقات تلقائياً بعد مرور الفترة المحددة للحفاظ على الأداء'
                  : 'Supprimer automatiquement les messages et pièces jointes expirés'}
              </p>
            </div>
          </div>
          <Switch
            id="enable-retention"
            checked={policy.enabled}
            onCheckedChange={(checked) => setPolicy((prev) => ({ ...prev, enabled: checked }))}
          />
        </div>

        {policy.enabled && (
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="retention-period" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isRTL ? 'المدة الزمنية للاحتفاظ' : 'Durée de conservation'}
                </Label>
                <Input
                  id="retention-period"
                  type="number"
                  min="1"
                  max="999"
                  value={policy.period}
                  onChange={(e) =>
                    setPolicy((prev) => ({ ...prev, period: parseInt(e.target.value, 10) || 1 }))
                  }
                  className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="retention-unit" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isRTL ? 'وحدة القياس' : 'Unité'}
                </Label>
                <Select
                  value={policy.unit}
                  onValueChange={(value: 'days' | 'months' | 'years') =>
                    setPolicy((prev) => ({ ...prev, unit: value }))
                  }
                >
                  <SelectTrigger id="retention-unit" className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">{isRTL ? 'أيام' : 'Jours'}</SelectItem>
                    <SelectItem value="months">{isRTL ? 'أشهر' : 'Mois'}</SelectItem>
                    <SelectItem value="years">{isRTL ? 'سنوات' : 'Ans'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/35 rounded-lg">
              <Calendar className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
              <AlertDescription className="text-xs sm:text-sm text-[#2c5282] dark:text-blue-200 font-medium ms-2 tabular-nums">
                {isRTL
                  ? `سيتم حذف المراسلات والمرفقات الأقدم من ${policy.period} ${formatUnit(policy.unit)} تلقائياً.`
                  : `Les messages de plus de ${policy.period} ${formatUnit(policy.unit)} seront purgés automatiquement.`}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            onClick={handleSavePolicy}
            disabled={savingPolicy}
            className="h-10 px-5 text-sm font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg gap-2 whitespace-nowrap"
          >
            {savingPolicy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>
              {savingPolicy
                ? isRTL
                  ? 'جاري الحفظ...'
                  : 'Enregistrement...'
                : isRTL
                  ? 'حفظ سياسة الحفظ'
                  : 'Enregistrer la politique'}
            </span>
          </Button>
        </div>
      </div>

      {/* Manual Cleanup Section */}
      <div className="p-5 rounded-lg border border-red-200/80 dark:border-red-900/60 bg-white dark:bg-slate-900 space-y-5">
        <div className="flex items-start gap-2.5">
          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400 mt-1 shrink-0" />
          <div>
            <h3 className="text-base font-bold text-red-700 dark:text-red-400">
              {isRTL ? 'تنظيف يدوي للرسائل القديمة' : 'Purge manuelle des anciens messages'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {isRTL
                ? 'حذف فوري للمراسلات والمرفقات الأقدم من فترة محددة لتفريغ مساحة التخزين.'
                : 'Suppression immédiate des messages et pièces jointes dépassant la durée choisie.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="delete-period" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {isRTL ? 'الأقدم من' : 'Plus anciens que'}
            </Label>
            <Input
              id="delete-period"
              type="number"
              min="1"
              max="999"
              value={deleteForm.period}
              onChange={(e) =>
                setDeleteForm((prev) => ({ ...prev, period: parseInt(e.target.value, 10) || 1 }))
              }
              className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="delete-unit" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {isRTL ? 'وحدة القياس' : 'Unité'}
            </Label>
            <Select
              value={deleteForm.unit}
              onValueChange={(value: 'days' | 'months' | 'years') =>
                setDeleteForm((prev) => ({ ...prev, unit: value }))
              }
            >
              <SelectTrigger id="delete-unit" className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="days">{isRTL ? 'أيام' : 'Jours'}</SelectItem>
                <SelectItem value="months">{isRTL ? 'أشهر' : 'Mois'}</SelectItem>
                <SelectItem value="years">{isRTL ? 'سنوات' : 'Ans'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
            <div className="text-lg font-bold text-red-600 dark:text-red-400 tabular-nums">
              {estimatedEligibleCount}
            </div>
            <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {isRTL ? 'رسائل تقديرية مؤهلة للحذف' : 'Messages éligibles (est.)'}
            </div>
          </div>
        </div>

        <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/35 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          <AlertDescription className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 font-medium ms-2">
            {isRTL
              ? `تحذير: سيتم حذف جميع المراسلات والمرفقات الأقدم من ${deleteForm.period} ${formatUnit(deleteForm.unit)} نهائياً. يُنصح بإنشاء نسخة احتياطية قبل المتابعة.`
              : `Attention : les messages et pièces jointes de plus de ${deleteForm.period} ${formatUnit(deleteForm.unit)} seront supprimés définitivement.`}
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={handleBackupFirst}
            className="h-10 px-4 text-sm font-semibold border-slate-300 dark:border-slate-700 text-[#2c5282] dark:text-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg gap-2 whitespace-nowrap"
          >
            <Database className="h-4 w-4" />
            <span>{isRTL ? 'إنشاء نسخة احتياطية أولاً' : 'Sauvegarder avant'}</span>
          </Button>

          <Button
            type="button"
            onClick={() => setIsConfirmDeleteOpen(true)}
            disabled={deleting || loading}
            className="h-10 px-5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg gap-2 whitespace-nowrap"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            <span>{isRTL ? 'تنفيذ عملية الحذف' : 'Exécuter la purge'}</span>
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent
          dir={dir}
          className="w-[95vw] sm:max-w-[540px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
        >
          <AlertDialogHeader className="text-start">
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center justify-center mb-2">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-red-700 dark:text-red-400">
              {isRTL ? 'تأكيد حذف المراسلات نهائياً' : 'Confirmer la suppression définitive'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
              {isRTL
                ? `أنت على وشك حذف كافة المراسلات والمرفقات الأقدم من ${deleteForm.period} ${formatUnit(deleteForm.unit)}. لا يمكن استرجاع هذه البيانات بعد التأكيد.`
                : `Vous allez supprimer définitivement les messages et pièces jointes de plus de ${deleteForm.period} ${formatUnit(deleteForm.unit)}. Cette action est irréversible.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <AlertDialogCancel className="h-10 px-5 rounded-lg border-slate-300 dark:border-slate-700 text-sm">
              {isRTL ? 'إلغاء' : 'Annuler'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMessages}
              className="h-10 px-6 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
            >
              {isRTL ? 'تأكيد الحذف النهائي' : 'Supprimer définitivement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MessageRetentionPanel;
