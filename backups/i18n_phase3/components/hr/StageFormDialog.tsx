import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  RHStage,
  RHStageFormData,
  createStage,
  updateStage,
  getEcoles,
  getTypesFormation,
  createEcole,
  RHEcoleRef,
  RHTypeFormationRef
} from '@/services/rhStageService';
import { getPersonnelList } from '@/services/hr/personnelApi';
import { toast } from 'sonner';
import {
  GraduationCap,
  Building2,
  Calendar,
  Save,
  Plus,
  X,
  MapPin,
  FileText,
  Globe2,
  AlertCircle
} from 'lucide-react';

interface StageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage?: RHStage | null;
  defaultPersonnelId?: string;
  onSuccess?: () => void;
}

export const StageFormDialog: React.FC<StageFormDialogProps> = ({
  open,
  onOpenChange,
  stage,
  defaultPersonnelId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const isEditing = Boolean(stage?._id);

  // Données du formulaire
  const [personnelId, setPersonnelId] = useState<string>('');
  const [localisation, setLocalisation] = useState<'tunisie' | 'etranger'>('tunisie');
  const [pays, setPays] = useState<string>('تونس');
  const [lieuStage, setLieuStage] = useState<string>('');
  const [sujetStage, setSujetStage] = useState<string>('');
  const [typeFormationId, setTypeFormationId] = useState<string>('NONE');
  const [ecoleId, setEcoleId] = useState<string>('NONE');
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');
  const [numeroRoute, setNumeroRoute] = useState<string>('');
  const [numeroStage, setNumeroStage] = useState<string>('');
  const [statut, setStatut] = useState<'inscrit' | 'en_cours' | 'acheve' | 'suspendu' | 'abandonne'>('acheve');
  const [resultat, setResultat] = useState<'admis' | 'refuse' | 'en_attente' | ''>('admis');
  const [mention, setMention] = useState<string>('');
  const [observations, setObservations] = useState<string>('');

  // Dialog d'ajout rapide d'école
  const [showAddEcoleDialog, setShowAddEcoleDialog] = useState(false);
  const [newEcoleNom, setNewEcoleNom] = useState('');
  const [newEcoleNomAr, setNewEcoleNomAr] = useState('');
  const [newEcolePays, setNewEcolePays] = useState('تونس');
  const [newEcoleVille, setNewEcoleVille] = useState('');

  // Erreurs de validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Récupération de la liste du personnel
  const { data: personnelData } = useQuery({
    queryKey: ['personnel-for-stages'],
    queryFn: () => getPersonnelList({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });
  const personnelList = personnelData?.data || [];

  // Récupération des référentiels (écoles et types de formation)
  const { data: ecoles = [], refetch: refetchEcoles } = useQuery<RHEcoleRef[]>({
    queryKey: ['rh-ecoles'],
    queryFn: getEcoles,
    staleTime: 5 * 60 * 1000,
  });

  const { data: typesFormation = [] } = useQuery<RHTypeFormationRef[]>({
    queryKey: ['rh-types-formation'],
    queryFn: getTypesFormation,
    staleTime: 5 * 60 * 1000,
  });

  // Initialisation lors de l'ouverture ou du changement d'édition
  useEffect(() => {
    if (open) {
      if (stage) {
        const pId = typeof stage.personnelId === 'object' ? stage.personnelId._id : stage.personnelId;
        setPersonnelId(pId || '');
        setLocalisation(stage.localisation || 'tunisie');
        setPays(stage.pays || (stage.localisation === 'etranger' ? '' : 'تونس'));
        setLieuStage(stage.lieuStage || '');
        setSujetStage(stage.sujetStage || '');
        
        const tId = typeof stage.typeFormationId === 'object' ? stage.typeFormationId?._id : stage.typeFormationId;
        setTypeFormationId(tId || 'NONE');

        const eId = typeof stage.ecoleId === 'object' ? stage.ecoleId?._id : stage.ecoleId;
        setEcoleId(eId || 'NONE');

        setDateDebut(stage.dateDebut ? new Date(stage.dateDebut).toISOString().split('T')[0] : '');
        setDateFin(stage.dateFin ? new Date(stage.dateFin).toISOString().split('T')[0] : '');
        setNumeroRoute(stage.numeroRoute || '');
        setNumeroStage(stage.numeroStage || '');
        setStatut(stage.statut || 'acheve');
        setResultat(stage.resultat || '');
        setMention(stage.mention || '');
        setObservations(stage.observations || '');
      } else {
        // Mode création
        setPersonnelId(defaultPersonnelId || '');
        setLocalisation('tunisie');
        setPays('تونس');
        setLieuStage('');
        setSujetStage('');
        setTypeFormationId('NONE');
        setEcoleId('NONE');
        setDateDebut('');
        setDateFin('');
        setNumeroRoute('');
        setNumeroStage('');
        setStatut('acheve');
        setResultat('admis');
        setMention('');
        setObservations('');
      }
      setErrors({});
    }
  }, [open, stage, defaultPersonnelId]);

  // Mutation création / mise à jour
  const stageMutation = useMutation({
    mutationFn: async (payload: RHStageFormData) => {
      if (isEditing && stage?._id) {
        return updateStage(stage._id, payload);
      }
      return createStage(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-stages'] });
      queryClient.invalidateQueries({ queryKey: ['rh-stage-stats'] });
      queryClient.invalidateQueries({ queryKey: ['personnel-stages'] });
      toast.success(isEditing ? 'تم تعديل بيانات التربص بنجاح' : 'تمت إضافة التربص بنجاح');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: unknown) => {
      const msg = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      toast.error(msg || 'تعذر حفظ بيانات التربص');
    },
  });

  // Mutation ajout rapide d'école
  const addEcoleMutation = useMutation({
    mutationFn: (data: { nom: string; nomAr: string; pays?: string; ville?: string }) =>
      createEcole(data),
    onSuccess: (newEcole) => {
      toast.success('تمت إضافة المدرسة بنجاح');
      refetchEcoles();
      setEcoleId(newEcole._id);
      setShowAddEcoleDialog(false);
      setNewEcoleNom('');
      setNewEcoleNomAr('');
      setNewEcolePays('تونس');
      setNewEcoleVille('');
    },
    onError: (error: unknown) => {
      const msg = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      toast.error(msg || 'تعذر إضافة المدرسة');
    },
  });

  // Basculement Tunisie / Étranger
  const handleLocalisationChange = (val: 'tunisie' | 'etranger') => {
    setLocalisation(val);
    if (val === 'tunisie') {
      setPays('تونس');
    } else if (pays === 'تونس') {
      setPays('');
    }
  };

  // Validation
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!personnelId) errs.personnelId = 'يرجى اختيار الموظف المعني';
    if (!sujetStage.trim()) errs.sujetStage = 'موضوع التربص إجباري';
    if (!lieuStage.trim()) errs.lieuStage = 'مكان التربص إجباري';
    if (!dateDebut) errs.dateDebut = 'تاريخ البداية إجباري';
    if (!dateFin) errs.dateFin = 'تاريخ النهاية إجباري';

    if (dateDebut && dateFin && new Date(dateFin) < new Date(dateDebut)) {
      errs.dateFin = 'تاريخ النهاية يجب أن يكون لاحقاً لتاريخ البداية';
    }

    if (localisation === 'etranger' && !pays.trim()) {
      errs.pays = 'يرجى تحديد الدولة';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: RHStageFormData = {
      personnelId,
      localisation,
      pays: pays.trim() || (localisation === 'tunisie' ? 'تونس' : ''),
      lieuStage: lieuStage.trim(),
      sujetStage: sujetStage.trim(),
      typeFormationId: typeFormationId !== 'NONE' ? typeFormationId : null,
      ecoleId: ecoleId !== 'NONE' ? ecoleId : null,
      dateDebut,
      dateFin,
      numeroRoute: numeroRoute.trim(),
      numeroStage: numeroStage.trim(),
      statut,
      resultat,
      mention: mention.trim(),
      observations: observations.trim(),
    };

    stageMutation.mutate(payload);
  };

  const handleCreateEcole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEcoleNom.trim() || !newEcoleNomAr.trim()) {
      toast.error('يرجى كتابة اسم المدرسة باللغتين');
      return;
    }
    addEcoleMutation.mutate({
      nom: newEcoleNom.trim(),
      nomAr: newEcoleNomAr.trim(),
      pays: newEcolePays.trim() || 'تونس',
      ville: newEcoleVille.trim(),
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto text-right" dir="rtl">
          <DialogHeader className="border-b border-[#e2e8f0] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded bg-[#ebf4ff] text-[#2c5282]">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-[#1a202c]">
                  {isEditing ? 'تعديل بيانات التربص / التكوين' : 'إضافة تربص جديد (تسجيل تاريخي / مباشر)'}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-0.5">
                  تسجيل الدورات التكوينية والتربصات المنجزة بتونس أو بالخارج لفائدة موظفي الإدارة
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            {/* 1. Sélection du personnel */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <span>الموظف المعني بالتربص</span>
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={personnelId}
                onValueChange={(val) => {
                  setPersonnelId(val);
                  if (errors.personnelId) {
                    setErrors((prev) => ({ ...prev, personnelId: '' }));
                  }
                }}
                disabled={Boolean(defaultPersonnelId && !isEditing)}
              >
                <SelectTrigger className={`h-11 text-right bg-white ${errors.personnelId ? 'border-red-500' : 'border-[#cbd5e1]'}`}>
                  <SelectValue placeholder="-- اختر الموظف --" />
                </SelectTrigger>
                <SelectContent className="text-right max-h-60" dir="rtl">
                  {personnelList.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.nom} {p.prenom} {p.cin ? `(ب.ت.و: ${p.cin})` : ''} {p.matricule ? `- [${p.matricule}]` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.personnelId && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.personnelId}</span>
                </p>
              )}
            </div>

            {/* 2. Localisation (Tunisie / Étranger) + Pays */}
            <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <Label className="text-sm font-bold text-gray-800 block mb-2">
                    نطاق التربص الجغرافي <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
                      <input
                        type="radio"
                        name="localisation"
                        value="tunisie"
                        checked={localisation === 'tunisie'}
                        onChange={() => handleLocalisationChange('tunisie')}
                        className="w-4 h-4 text-[#2c5282] focus:ring-[#2c5282]"
                      />
                      <span>تربص بتونس</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
                      <input
                        type="radio"
                        name="localisation"
                        value="etranger"
                        checked={localisation === 'etranger'}
                        onChange={() => handleLocalisationChange('etranger')}
                        className="w-4 h-4 text-[#2c5282] focus:ring-[#2c5282]"
                      />
                      <span className="flex items-center gap-1">
                        <Globe2 className="w-4 h-4 text-blue-600" />
                        <span>تربص بالخارج</span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="w-full sm:w-60">
                  <Label className="text-sm font-semibold text-gray-700 block mb-1">
                    الدولة <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={pays}
                    onChange={(e) => setPays(e.target.value)}
                    placeholder="مثال: فرنسا، الصين، تونس..."
                    disabled={localisation === 'tunisie'}
                    className={`h-11 bg-white ${errors.pays ? 'border-red-500' : 'border-[#cbd5e1]'}`}
                  />
                  {errors.pays && (
                    <p className="text-xs text-red-600 mt-1">{errors.pays}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Sujet et Lieu du stage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-gray-800">
                  موضوع التربص / التكوين <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={sujetStage}
                  onChange={(e) => {
                    setSujetStage(e.target.value);
                    if (errors.sujetStage) setErrors((prev) => ({ ...prev, sujetStage: '' }));
                  }}
                  placeholder="مثال: إدارة خوادم الشبكات، القيادة الإدارية..."
                  className={`h-11 bg-white ${errors.sujetStage ? 'border-red-500' : 'border-[#cbd5e1]'}`}
                />
                {errors.sujetStage && (
                  <p className="text-xs text-red-600 mt-1">{errors.sujetStage}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-gray-800">
                  مكان التربص (المعهد / المركز / المدينة) <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={lieuStage}
                  onChange={(e) => {
                    setLieuStage(e.target.value);
                    if (errors.lieuStage) setErrors((prev) => ({ ...prev, lieuStage: '' }));
                  }}
                  placeholder="مثال: مدرسة العوينة، معهد الدفاع الوطني، بكين..."
                  className={`h-11 bg-white ${errors.lieuStage ? 'border-red-500' : 'border-[#cbd5e1]'}`}
                />
                {errors.lieuStage && (
                  <p className="text-xs text-red-600 mt-1">{errors.lieuStage}</p>
                )}
              </div>
            </div>

            {/* 4. École de formation et Type de formation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-gray-700">
                    المدرسة / الهيكل المكون (اختياري)
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddEcoleDialog(true)}
                    className="h-7 px-2 text-xs text-[#2c5282] hover:bg-[#ebf4ff] flex items-center gap-1 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة مدرسة</span>
                  </Button>
                </div>
                <Select value={ecoleId} onValueChange={setEcoleId}>
                  <SelectTrigger className="h-11 text-right bg-white border-[#cbd5e1]">
                    <SelectValue placeholder="-- اختر المدرسة إن وجدت --" />
                  </SelectTrigger>
                  <SelectContent className="text-right max-h-60" dir="rtl">
                    <SelectItem value="NONE">-- غير محدد --</SelectItem>
                    {ecoles.map((ec) => (
                      <SelectItem key={ec._id} value={ec._id}>
                        {ec.nomAr || ec.nom} {ec.pays ? `(${ec.pays})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">
                  نوع التكوين (اختياري)
                </Label>
                <Select value={typeFormationId} onValueChange={setTypeFormationId}>
                  <SelectTrigger className="h-11 text-right bg-white border-[#cbd5e1]">
                    <SelectValue placeholder="-- اختر نوع التكوين --" />
                  </SelectTrigger>
                  <SelectContent className="text-right max-h-60" dir="rtl">
                    <SelectItem value="NONE">-- غير محدد --</SelectItem>
                    {typesFormation.map((tf) => (
                      <SelectItem key={tf._id} value={tf._id}>
                        {tf.nomAr || tf.nom} {tf.code ? `[${tf.code}]` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 5. Dates de début et de fin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#2c5282]" />
                  <span>تاريخ بداية التربص</span>
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => {
                    setDateDebut(e.target.value);
                    if (errors.dateDebut) setErrors((prev) => ({ ...prev, dateDebut: '' }));
                  }}
                  className={`h-11 bg-white ${errors.dateDebut ? 'border-red-500' : 'border-[#cbd5e1]'}`}
                />
                {errors.dateDebut && (
                  <p className="text-xs text-red-600 mt-1">{errors.dateDebut}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#2c5282]" />
                  <span>تاريخ نهاية التربص</span>
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={dateFin}
                  onChange={(e) => {
                    setDateFin(e.target.value);
                    if (errors.dateFin) setErrors((prev) => ({ ...prev, dateFin: '' }));
                  }}
                  className={`h-11 bg-white ${errors.dateFin ? 'border-red-500' : 'border-[#cbd5e1]'}`}
                />
                {errors.dateFin && (
                  <p className="text-xs text-red-600 mt-1">{errors.dateFin}</p>
                )}
              </div>
            </div>

            {/* 6. Numéro de route et numéro de stage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">
                  رقم الإرسالية / Route (اختياري)
                </Label>
                <Input
                  value={numeroRoute}
                  onChange={(e) => setNumeroRoute(e.target.value)}
                  placeholder="مثال: 2024/0981"
                  className="h-11 bg-white border-[#cbd5e1]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">
                  رقم التربص / المرجع (اختياري)
                </Label>
                <Input
                  value={numeroStage}
                  onChange={(e) => setNumeroStage(e.target.value)}
                  placeholder="مثال: STG-102"
                  className="h-11 bg-white border-[#cbd5e1]"
                />
              </div>
            </div>

            {/* 7. Statut, Résultat et Mention */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-gray-800">حالة التربص</Label>
                <Select value={statut} onValueChange={(val: any) => setStatut(val)}>
                  <SelectTrigger className="h-11 text-right bg-white border-[#cbd5e1]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-right" dir="rtl">
                    <SelectItem value="acheve">مكتمل / منجز (Achevé)</SelectItem>
                    <SelectItem value="en_cours">قيد الإنجاز (En cours)</SelectItem>
                    <SelectItem value="inscrit">مسجل (Inscrit)</SelectItem>
                    <SelectItem value="suspendu">معلق (Suspendu)</SelectItem>
                    <SelectItem value="abandonne">ملغى / منسحب (Abandonné)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-gray-800">النتيجة</Label>
                <Select value={resultat || 'EMPTY'} onValueChange={(val) => setResultat(val === 'EMPTY' ? '' : (val as any))}>
                  <SelectTrigger className="h-11 text-right bg-white border-[#cbd5e1]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-right" dir="rtl">
                    <SelectItem value="EMPTY">-- غير محددة --</SelectItem>
                    <SelectItem value="admis">ناجح / مؤهل (Admis)</SelectItem>
                    <SelectItem value="refuse">راسب / غير مؤهل (Refusé)</SelectItem>
                    <SelectItem value="en_attente">في انتظار النتيجة (En attente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">الملاحظة / التقدير</Label>
                <Input
                  value={mention}
                  onChange={(e) => setMention(e.target.value)}
                  placeholder="مثال: حسن جداً، مشرف..."
                  className="h-11 bg-white border-[#cbd5e1]"
                />
              </div>
            </div>

            {/* 8. Observations */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-gray-700">ملاحظات إضافية</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={2}
                placeholder="أية توضيحات أو تفاصيل أخرى حول هذا التربص..."
                className="bg-white border-[#cbd5e1] text-sm"
              />
            </div>

            <DialogFooter className="border-t border-[#e2e8f0] pt-4 flex flex-row items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 px-5 text-gray-700 border-[#cbd5e1]"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={stageMutation.isPending}
                className="h-11 px-6 bg-[#2c5282] hover:bg-[#234269] text-white font-bold flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{stageMutation.isPending ? 'جاري الحفظ...' : isEditing ? 'حفظ التعديلات' : 'تسجيل التربص'}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Secondaire : Ajout rapide d'école */}
      <Dialog open={showAddEcoleDialog} onOpenChange={setShowAddEcoleDialog}>
        <DialogContent className="max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1a202c] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#2c5282]" />
              <span>إضافة مدرسة تكوين جديدة</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateEcole} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-gray-800">
                اسم المدرسة بالعربية <span className="text-red-500">*</span>
              </Label>
              <Input
                value={newEcoleNomAr}
                onChange={(e) => setNewEcoleNomAr(e.target.value)}
                placeholder="مثال: مدرسة ضباط الصف"
                className="h-10 bg-white border-[#cbd5e1]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-gray-800">
                اسم المدرسة بالفرنسية / اللاتينية <span className="text-red-500">*</span>
              </Label>
              <Input
                value={newEcoleNom}
                onChange={(e) => setNewEcoleNom(e.target.value)}
                placeholder="Ex: École des Sous-Officiers"
                className="h-10 bg-white border-[#cbd5e1]"
                dir="ltr"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-700">الدولة</Label>
                <Input
                  value={newEcolePays}
                  onChange={(e) => setNewEcolePays(e.target.value)}
                  placeholder="تونس"
                  className="h-10 bg-white border-[#cbd5e1]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-700">المدينة</Label>
                <Input
                  value={newEcoleVille}
                  onChange={(e) => setNewEcoleVille(e.target.value)}
                  placeholder="تونس، بنزرت..."
                  className="h-10 bg-white border-[#cbd5e1]"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddEcoleDialog(false)}
                className="h-10 text-xs"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={addEcoleMutation.isPending}
                className="h-10 px-4 text-xs bg-[#2c5282] hover:bg-[#234269] text-white font-bold"
              >
                {addEcoleMutation.isPending ? 'جاري الإضافة...' : 'حفظ المدرسة'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StageFormDialog;
