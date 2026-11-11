import React, { useState, useEffect } from 'react';
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

interface AttendanceDeclarationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: string;
  leaveReasons?: LeaveReason[];
  onSuccess: () => void;
}

const formSchema = z
  .object({
    date: z.string().min(1, 'التاريخ مطلوب'),
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
    if (data.statut === 'absent') {
      if (!data.motif) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'يرجى اختيار سبب الغياب',
          path: ['motif'],
        });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

export const AttendanceDeclarationDialog: React.FC<AttendanceDeclarationDialogProps> = ({
  open,
  onOpenChange,
  initialDate,
  leaveReasons: propReasons,
  onSuccess,
}) => {
  const [reasonsList, setReasonsList] = useState<LeaveReason[]>(propReasons || []);
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      toast.success('تم إرسال تصريح الحضور / الغياب بنجاح، بانتظار مراجعة الإدارة');
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Erreur soumission déclaration:', error);
      const msg =
        error && typeof error === 'object' && 'response' in error
          ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message ||
            'تعذر إرسال التصريح، يرجى المحاولة لاحقاً')
          : 'تعذر إرسال التصريح، يرجى المحاولة لاحقاً';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden text-right border-[#e2e8f0] shadow-xl" dir="rtl">
        {/* En-tête style sobre institutionnel */}
        <div className="bg-[#2c5282] px-6 py-4 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center justify-between text-white">
              <span className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-200" />
                تصريح مسبق بالحضور / الغياب
              </span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-blue-100 mt-1">
            سجّل تصريحك المسبق لتأكيد حضورك أو تقديم مبرر غيابك ليتم اعتماده من طرف مصلحة الموارد البشرية.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 bg-white">
          {/* Sélection Date & Heure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-[#2c5282]" />
                التاريخ المعني <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <Input
                    {...field}
                    type="date"
                    min={todayStr}
                    className="h-11 border-[#e2e8f0] focus:border-[#2c5282] focus:ring-[#2c5282] text-sm text-gray-800 rounded bg-gray-50/50"
                  />
                )}
              />
              {errors.date && (
                <p className="text-xs text-red-500">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#2c5282]" />
                ساعة الحضور المتوقعة
              </Label>
              <Controller
                control={control}
                name="heureArrivee"
                render={({ field }) => (
                  <Input
                    {...field}
                    type="time"
                    disabled={selectedStatut === 'absent'}
                    className="h-11 border-[#e2e8f0] focus:border-[#2c5282] text-sm text-gray-800 rounded disabled:bg-gray-100 disabled:opacity-60"
                  />
                )}
              />
            </div>
          </div>

          {/* Choix Statut (حاضر / غائب) */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700">
              نوع التصريح <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setValue('statut', 'present')}
                className={`flex items-center justify-center gap-2.5 h-12 rounded border transition-all ${
                  selectedStatut === 'present'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-800 font-bold shadow-sm ring-1 ring-emerald-500'
                    : 'border-[#e2e8f0] hover:bg-gray-50 text-gray-600'
                }`}
              >
                <UserCheck className={`w-5 h-5 ${selectedStatut === 'present' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span>حاضر (مداومة عادية)</span>
              </button>

              <button
                type="button"
                onClick={() => setValue('statut', 'absent')}
                className={`flex items-center justify-center gap-2.5 h-12 rounded border transition-all ${
                  selectedStatut === 'absent'
                    ? 'border-amber-600 bg-amber-50/80 text-amber-800 font-bold shadow-sm ring-1 ring-amber-500'
                    : 'border-[#e2e8f0] hover:bg-gray-50 text-gray-600'
                }`}
              >
                <UserX className={`w-5 h-5 ${selectedStatut === 'absent' ? 'text-amber-600' : 'text-gray-400'}`} />
                <span>غائب / مبرر / مصلحة</span>
              </button>
            </div>
          </div>

          {/* Section spécifique à l'absence */}
          {selectedStatut === 'absent' && (
            <div className="p-4 bg-amber-50/40 rounded-lg border border-amber-200/80 space-y-4 animate-in fade-in-50 duration-200">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                  <span>سبب أو نوع الغياب <span className="text-red-500">*</span></span>
                  {currentReason?.impacteSolde && (
                    <span className="text-[11px] text-red-600 font-normal">
                      ⚠️ يخصم من رصيد الإجازات السنوية
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
                      <SelectTrigger className="h-11 border-[#e2e8f0] bg-white text-right focus:border-[#2c5282]">
                        <SelectValue placeholder={loadingReasons ? 'جاري تحميل الأسباب...' : 'اختر سبب الغياب / المصلحة'} />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {reasonsList.map((reason) => (
                          <SelectItem key={reason._id} value={reason.code}>
                            <div className="flex items-center justify-between w-full gap-2">
                              <span>{reason.labelAr}</span>
                              {reason.labelFr && (
                                <span className="text-xs text-gray-400 font-mono">({reason.labelFr})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.motif && (
                  <p className="text-xs text-red-500">{errors.motif.message}</p>
                )}
              </div>

              {/* Champ conditionnel : Nom du service */}
              {(currentReason?.requiresServiceName || selectedMotif === 'service') && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#2c5282]" />
                    اسم المصلحة / الإدارة المستقبلة <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="nomService"
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="مثال: مصلحة الضرائب، وزارة الشؤون الاجتماعية..."
                        className="h-11 border-[#e2e8f0] bg-white text-sm"
                      />
                    )}
                  />
                </div>
              )}

              {/* Champs conditionnels : Mission (Lieu & Objet) */}
              {(currentReason?.requiresLieu || selectedMotif === 'mission') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#2c5282]" />
                      مكان المأمورية <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      control={control}
                      name="lieuMission"
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="المدينة / المقر"
                          className="h-11 border-[#e2e8f0] bg-white text-sm"
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">موضوع المأمورية</Label>
                    <Controller
                      control={control}
                      name="objetMission"
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="طبيعة العمل المكلف به"
                          className="h-11 border-[#e2e8f0] bg-white text-sm"
                        />
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Champ conditionnel : Formation */}
              {(currentReason?.requiresFormationDetails || selectedMotif === 'formation') && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-[#2c5282]" />
                    عنوان الدورة التكوينية أو التدريب <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="intituleFormation"
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="مثال: دورة السلامة المهنية، تدريب إدارة النظم..."
                        className="h-11 border-[#e2e8f0] bg-white text-sm"
                      />
                    )}
                  />
                </div>
              )}

              {/* Commentaire ou précisions */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                  ملاحظات أو تفاصيل إضافية
                </Label>
                <Controller
                  control={control}
                  name="commentaire"
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      rows={2}
                      placeholder="أية توضيحات إضافية للإدارة..."
                      className="border-[#e2e8f0] bg-white text-sm resize-none"
                    />
                  )}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-3 pt-3 border-t border-[#e2e8f0]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-11 px-5 border-[#e2e8f0] text-gray-700 hover:bg-gray-100"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-6 bg-[#2c5282] hover:bg-[#1a365d] text-white font-medium gap-2 shadow"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                'تأكيد وإرسال التصريح'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceDeclarationDialog;
