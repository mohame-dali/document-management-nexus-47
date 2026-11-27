import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Calendar as CalendarIcon,
  Clock,
  UserCheck,
  UserX,
  Building,
  MapPin,
  GraduationCap,
  MessageSquare,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { LeaveReason, getLeaveReasons } from '@/services/leaveReasonService';
import {
  declareAttendance,
  AttendanceDeclarationInput,
} from '@/services/attendanceDeclarationService';
import { useDirection } from '@/i18n/useDirection';

interface AttendanceDeclarationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: string;
  leaveReasons?: LeaveReason[];
  onSuccess: () => void;
}

type FormValues = {
  date: string;
  statut: 'present' | 'absent';
  motif?: string;
  leaveReasonId?: string;
  nomService?: string;
  lieuMission?: string;
  objetMission?: string;
  intituleFormation?: string;
  commentaire?: string;
  heureArrivee?: string;
};

export const AttendanceDeclarationDialog: React.FC<AttendanceDeclarationDialogProps> = ({
  open,
  onOpenChange,
  initialDate,
  leaveReasons: propReasons,
  onSuccess,
}) => {
  const { dir, isRTL } = useDirection();
  const [reasonsList, setReasonsList] = useState<LeaveReason[]>(propReasons || []);
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formSchema = useMemo(
    () =>
      z
        .object({
          date: z.string().min(1, isRTL ? 'التاريخ مطلوب' : 'La date est requise'),
          statut: z.enum(['present', 'absent']),
          motif: z.string().optional(),
          leaveReasonId: z.string().optional(),
          nomService: z.string().optional(),
          lieuMission: z.string().optional(),
          objetMission: z.string().optional(),
          intituleFormation: z.string().optional(),
          commentaire: z.string().optional(),
          heureArrivee: z.string().optional(),
        })
        .superRefine((data, ctx) => {
          if (data.statut === 'absent' && !data.motif) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: isRTL ? 'يرجى اختيار سبب الغياب' : "Veuillez sélectionner un motif d'absence",
              path: ['motif'],
            });
          }
        }),
    [isRTL]
  );

  // Date du jour pour restreindre la date minimum
  const todayStr = new Date().toISOString().split('T')[0];

  const defaultDateValue = initialDate || todayStr;

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: defaultDateValue,
      statut: 'present',
      motif: '',
      leaveReasonId: '',
      nomService: '',
      lieuMission: '',
      objetMission: '',
      intituleFormation: '',
      commentaire: '',
      heureArrivee: '08:30',
    },
  });

  const selectedStatut = watch('statut');
  const selectedMotif = watch('motif');

  // Charger les motifs de congé / absence si non fournis
  useEffect(() => {
    if (propReasons && propReasons.length > 0) {
      setReasonsList(propReasons.filter((r) => r.isActive));
    } else if (open) {
      setLoadingReasons(true);
      getLeaveReasons({ isActive: true })
        .then((res: unknown) => {
          if (Array.isArray(res)) {
            setReasonsList(res);
          } else if (res && typeof res === 'object' && 'data' in res && Array.isArray((res as { data: LeaveReason[] }).data)) {
            setReasonsList((res as { data: LeaveReason[] }).data);
          }
        })
        .catch((err: unknown) => {
          console.error('Erreur chargement motifs:', err);
        })
        .finally(() => setLoadingReasons(false));
    }
  }, [open, propReasons]);

  // Réinitialiser le formulaire à l'ouverture
  useEffect(() => {
    if (open) {
      reset({
        date: initialDate || todayStr,
        statut: 'present',
        motif: '',
        leaveReasonId: '',
        nomService: '',
        lieuMission: '',
        objetMission: '',
        intituleFormation: '',
        commentaire: '',
        heureArrivee: '08:30',
      });
    }
  }, [open, initialDate, todayStr, reset]);

  // Identifier le motif sélectionné pour les champs conditionnels
  const currentReason = reasonsList.find(
    (r) => r.code === selectedMotif || r._id === watch('leaveReasonId')
  );

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);

      const payload: AttendanceDeclarationInput = {
        date: values.date,
        statut: values.statut,
        heureArrivee: values.statut === 'present' ? values.heureArrivee || '08:30' : undefined,
      };

      if (values.statut === 'absent') {
        payload.motif = values.motif;
        payload.leaveReasonId = values.leaveReasonId || currentReason?._id || null;
        payload.detailsMotif = {
          nomService: values.nomService?.trim() || '',
          lieuMission: values.lieuMission?.trim() || '',
          objetMission: values.objetMission?.trim() || '',
          intituleFormation: values.intituleFormation?.trim() || '',
          commentaire: values.commentaire?.trim() || '',
        };
      }

      await declareAttendance(payload);
      toast.success(
        isRTL
          ? 'تم إرسال تصريح الحضور / الغياب بنجاح، بانتظار مراجعة الإدارة'
          : 'Déclaration envoyée avec succès, en attente de validation'
      );
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Erreur soumission déclaration:', error);
      const fallbackMsg = isRTL
        ? 'تعذر إرسال التصريح، يرجى المحاولة لاحقاً'
        : "Impossible d'envoyer la déclaration, veuillez réessayer";
      const msg =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || fallbackMsg
          : fallbackMsg;
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[560px] p-0 overflow-hidden text-start bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 rounded-xl shadow-lg"
        dir={dir}
      >
        {/* En-tête style sobre institutionnel */}
        <div className="bg-[#2c5282] px-6 py-4 text-white">
          <DialogHeader className="text-start">
            <DialogTitle className="text-lg font-bold flex items-center justify-between text-white">
              <span className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-200" />
                {isRTL ? 'تصريح مسبق بالحضور / الغياب' : 'Déclaration de présence ou d’absence'}
              </span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-blue-100 mt-1">
            {isRTL
              ? 'سجّل تصريحك المسبق لتأكيد حضورك أو تقديم مبرر غيابك ليتم اعتماده من طرف مصلحة الموارد البشرية.'
              : 'Soumettez votre déclaration pour confirmer votre présence ou justifier une absence auprès des RH.'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 bg-white dark:bg-slate-900">
          {/* Sélection Date & Heure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-[#2c5282] dark:text-sky-400" />
                {isRTL ? 'التاريخ المعني' : 'Date concernée'} <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <Input
                    {...field}
                    type="date"
                    min={todayStr}
                    className="h-11 border-slate-300 dark:border-slate-700 focus:border-[#2c5282] focus:ring-[#2c5282] text-sm text-slate-800 dark:text-slate-100 rounded-lg bg-slate-50/50 dark:bg-slate-800 tabular-nums"
                  />
                )}
              />
              {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#2c5282] dark:text-sky-400" />
                {isRTL ? 'ساعة الحضور المتوقعة' : 'Heure d’arrivée prévue'}
              </Label>
              <Controller
                control={control}
                name="heureArrivee"
                render={({ field }) => (
                  <Input
                    {...field}
                    type="time"
                    disabled={selectedStatut === 'absent'}
                    className="h-11 border-slate-300 dark:border-slate-700 focus:border-[#2c5282] text-sm text-slate-800 dark:text-slate-100 dark:bg-slate-800 rounded-lg disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:opacity-60 tabular-nums"
                  />
                )}
              />
            </div>
          </div>

          {/* Choix Statut (حاضر / غائب) */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {isRTL ? 'نوع التصريح' : 'Type de déclaration'} <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setValue('statut', 'present')}
                className={`flex items-center justify-center gap-2.5 h-12 rounded-lg border transition-all ${
                  selectedStatut === 'present'
                    ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-bold shadow-sm ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-700 dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <UserCheck
                  className={`w-5 h-5 ${
                    selectedStatut === 'present'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                />
                <span>{isRTL ? 'حاضر' : 'Présent'}</span>
              </button>

              <button
                type="button"
                onClick={() => setValue('statut', 'absent')}
                className={`flex items-center justify-center gap-2.5 h-12 rounded-lg border transition-all ${
                  selectedStatut === 'absent'
                    ? 'border-amber-600 bg-amber-50/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 font-bold shadow-sm ring-1 ring-amber-500'
                    : 'border-slate-200 dark:border-slate-700 dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <UserX
                  className={`w-5 h-5 ${
                    selectedStatut === 'absent'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                />
                <span>{isRTL ? 'غائب / مبرر / مصلحة' : 'Absence / Mission / Congé'}</span>
              </button>
            </div>
          </div>

          {/* Section spécifique à l'absence */}
          {selectedStatut === 'absent' && (
            <div className="p-4 bg-amber-50/40 dark:bg-amber-950/30 rounded-lg border border-amber-200/80 dark:border-amber-800/70 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>
                    {isRTL ? 'سبب أو نوع الغياب' : "Motif d'absence"} <span className="text-red-500">*</span>
                  </span>
                  {currentReason?.impacteSolde && (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                      {isRTL ? 'يخصم من رصيد الإجازات السنوية' : 'Déduit du solde annuel'}
                    </span>
                  )}
                </Label>
                <Controller
                  control={control}
                  name="motif"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        const r = reasonsList.find((item) => item.code === val);
                        if (r) {
                          setValue('leaveReasonId', r._id);
                        }
                      }}
                    >
                      <SelectTrigger className="h-11 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 text-start focus:border-[#2c5282] rounded-lg">
                        <SelectValue
                          placeholder={
                            loadingReasons
                              ? isRTL
                                ? 'جاري تحميل الأسباب...'
                                : 'Chargement des motifs...'
                              : isRTL
                              ? 'اختر سبب الغياب / المصلحة'
                              : 'Sélectionner un motif'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent dir={dir} className="dark:bg-slate-900 dark:border-slate-700">
                        {reasonsList.map((reason) => (
                          <SelectItem key={reason._id} value={reason.code}>
                            <span>{isRTL ? reason.labelAr : reason.labelFr || reason.labelAr}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.motif && <p className="text-xs text-red-500">{errors.motif.message}</p>}
              </div>

              {/* Champ conditionnel : Nom du service */}
              {(currentReason?.requiresServiceName || selectedMotif === 'service') && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#2c5282] dark:text-sky-400" />
                    {isRTL ? 'اسم المصلحة / الإدارة المستقبلة' : 'Service ou administration d’accueil'}{' '}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="nomService"
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder={isRTL ? 'مثال: مصلحة الضرائب...' : 'Ex : Direction des impôts...'}
                        className="h-11 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 text-sm rounded-lg"
                      />
                    )}
                  />
                </div>
              )}

              {/* Champs conditionnels : Mission (Lieu & Objet) */}
              {(currentReason?.requiresLieu || selectedMotif === 'mission') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#2c5282] dark:text-sky-400" />
                      {isRTL ? 'مكان المأمورية' : 'Lieu de mission'} <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      control={control}
                      name="lieuMission"
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder={isRTL ? 'المدينة / المقر' : 'Ville / Site'}
                          className="h-11 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 text-sm rounded-lg"
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {isRTL ? 'موضوع المأمورية' : 'Objet de la mission'}
                    </Label>
                    <Controller
                      control={control}
                      name="objetMission"
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder={isRTL ? 'طبيعة العمل المكلف به' : 'Description de la mission'}
                          className="h-11 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 text-sm rounded-lg"
                        />
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Champ conditionnel : Formation */}
              {(currentReason?.requiresFormationDetails || selectedMotif === 'formation') && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-[#2c5282] dark:text-sky-400" />
                    {isRTL ? 'عنوان الدورة التكوينية أو التدريب' : 'Intitulé de la formation'}{' '}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="intituleFormation"
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder={isRTL ? 'عنوان الدورة التكوينية...' : 'Intitulé de la formation...'}
                        className="h-11 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 text-sm rounded-lg"
                      />
                    )}
                  />
                </div>
              )}

              {/* Commentaire ou précisions */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  {isRTL ? 'ملاحظات أو تفاصيل إضافية' : 'Commentaire ou précisions'}
                </Label>
                <Controller
                  control={control}
                  name="commentaire"
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      rows={2}
                      placeholder={isRTL ? 'أية توضيحات إضافية للإدارة...' : 'Informations complémentaires...'}
                      className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 text-sm resize-none rounded-lg"
                    />
                  )}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-11 px-5 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              {isRTL ? 'إلغاء' : 'Annuler'}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-6 bg-[#2c5282] hover:bg-[#1a365d] text-white font-medium gap-2 shadow rounded-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isRTL ? 'جاري الإرسال...' : 'Envoi en cours...'}
                </>
              ) : isRTL ? (
                'تأكيد وإرسال التصريح'
              ) : (
                'Envoyer la déclaration'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceDeclarationDialog;
