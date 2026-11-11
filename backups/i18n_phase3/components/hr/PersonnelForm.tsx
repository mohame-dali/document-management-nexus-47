import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDepartments } from '@/services/departmentService';
import { Department } from '@/types';
import { Personnel, PersonnelSexe } from '@/types/hr';
import { uploadPersonnelPhoto, getPhotoUrl } from '@/services/hr/personnelApi';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Save,
  X,
  AlertCircle,
  Camera,
  Upload,
  Trash2,
  User as UserIcon,
  RefreshCw,
  Heart,
  Shield,
  PhoneCall,
} from 'lucide-react';
import { toast } from 'sonner';

export interface ContactUrgenceItem {
  nom: string;
  lien: string;
  telephone: string;
  adresse: string;
}

interface PersonnelFormProps {
  initialData?: Partial<Personnel> & Record<string, any>;
  onSubmit: (data: Partial<Personnel> & Record<string, any>, photoFile?: File | null) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const PersonnelForm: React.FC<PersonnelFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [nom, setNom] = useState(initialData?.nom || '');
  const [prenom, setPrenom] = useState(initialData?.prenom || '');
  const [dateNaissance, setDateNaissance] = useState(
    initialData?.dateNaissance ? new Date(initialData.dateNaissance).toISOString().split('T')[0] : ''
  );
  const [lieuNaissance, setLieuNaissance] = useState(initialData?.lieuNaissance || '');
  const [sexe, setSexe] = useState<PersonnelSexe | 'NONE'>(initialData?.sexe || 'NONE');
  const [cin, setCin] = useState(initialData?.cin || '');
  const [adresse, setAdresse] = useState(initialData?.adresse || '');
  const [telephone, setTelephone] = useState(initialData?.telephone || '');
  const [emailPersonnel, setEmailPersonnel] = useState(initialData?.emailPersonnel || '');
  const [poste, setPoste] = useState(initialData?.poste || '');
  const [activeDepartment, setActiveDepartment] = useState<string>(
    initialData?.activeDepartment
      ? typeof initialData.activeDepartment === 'object'
        ? (initialData.activeDepartment as Department)._id
        : initialData.activeDepartment
      : 'NONE'
  );
  const [dateEmbauche, setDateEmbauche] = useState(
    initialData?.dateEmbauche ? new Date(initialData.dateEmbauche).toISOString().split('T')[0] : ''
  );
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Groupe A — Identité étendue
  const [nomPere, setNomPere] = useState((initialData as any)?.nomPere || '');
  const [nomMere, setNomMere] = useState((initialData as any)?.nomMere || '');
  const [nomGrandPere, setNomGrandPere] = useState((initialData as any)?.nomGrandPere || '');
  const [groupeSanguin, setGroupeSanguin] = useState<string>((initialData as any)?.groupeSanguin || 'NONE');

  // Groupe B — Situation administrative
  const [dateEmissionCin, setDateEmissionCin] = useState(
    (initialData as any)?.dateEmissionCin
      ? new Date((initialData as any).dateEmissionCin).toISOString().split('T')[0]
      : ''
  );
  const [numeroUnite, setNumeroUnite] = useState((initialData as any)?.numeroUnite || '');
  const [numeroArmee, setNumeroArmee] = useState((initialData as any)?.numeroArmee || '');
  const [dateEngagement, setDateEngagement] = useState(
    (initialData as any)?.dateEngagement
      ? new Date((initialData as any).dateEngagement).toISOString().split('T')[0]
      : ''
  );
  const [typeEngagement, setTypeEngagement] = useState((initialData as any)?.typeEngagement || '');
  const [origineEngagement, setOrigineEngagement] = useState((initialData as any)?.origineEngagement || '');
  const [niveauEtude, setNiveauEtude] = useState((initialData as any)?.niveauEtude || '');
  const [diplomeBase, setDiplomeBase] = useState((initialData as any)?.diplomeBase || '');
  const [specialite, setSpecialite] = useState((initialData as any)?.specialite || '');
  const [arme, setArme] = useState((initialData as any)?.arme || '');
  const [posteActuel, setPosteActuel] = useState((initialData as any)?.posteActuel || (initialData as any)?.poste || '');

  // Groupe C — Situation familiale
  const [etatCivil, setEtatCivil] = useState<string>((initialData as any)?.etatCivil || 'NONE');
  const [nomConjoint, setNomConjoint] = useState((initialData as any)?.nomConjoint || '');
  const [dateMariage, setDateMariage] = useState(
    (initialData as any)?.dateMariage ? new Date((initialData as any).dateMariage).toISOString().split('T')[0] : ''
  );
  const [nombreEnfants, setNombreEnfants] = useState<string | number>(
    (initialData as any)?.nombreEnfants ?? (initialData as any)?.enfants ?? ''
  );

  // Groupe D — Passeport
  const [numeroPasseport, setNumeroPasseport] = useState((initialData as any)?.numeroPasseport || '');
  const [dateValiditePasseport, setDateValiditePasseport] = useState(
    (initialData as any)?.dateValiditePasseport
      ? new Date((initialData as any).dateValiditePasseport).toISOString().split('T')[0]
      : ''
  );

  // Groupe E — 3 personnes à prévenir
  const initialContacts = (initialData as any)?.personnesAPrevenir || (initialData as any)?.contactsUrgence || [];
  const [personne1, setPersonne1] = useState<ContactUrgenceItem>({
    nom: initialContacts[0]?.nom || '',
    lien: initialContacts[0]?.lien || '',
    telephone: initialContacts[0]?.telephone || '',
    adresse: initialContacts[0]?.adresse || '',
  });
  const [personne2, setPersonne2] = useState<ContactUrgenceItem>({
    nom: initialContacts[1]?.nom || '',
    lien: initialContacts[1]?.lien || '',
    telephone: initialContacts[1]?.telephone || '',
    adresse: initialContacts[1]?.adresse || '',
  });
  const [personne3, setPersonne3] = useState<ContactUrgenceItem>({
    nom: initialContacts[2]?.nom || '',
    lien: initialContacts[2]?.lien || '',
    telephone: initialContacts[2]?.telephone || '',
    adresse: initialContacts[2]?.adresse || '',
  });

  // Gestion de la photo
  const [photo, setPhoto] = useState<string>(initialData?.photo || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(
    initialData?.photo ? getPhotoUrl(initialData.photo) : ''
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<{ nom?: string; prenom?: string }>({});

  useEffect(() => {
    if (initialData) {
      setNom(initialData.nom || '');
      setPrenom(initialData.prenom || '');
      setDateNaissance(
        initialData.dateNaissance
          ? new Date(initialData.dateNaissance).toISOString().split('T')[0]
          : ''
      );
      setLieuNaissance(initialData.lieuNaissance || '');
      setSexe(initialData.sexe || 'NONE');
      setCin(initialData.cin || '');
      setAdresse(initialData.adresse || '');
      setTelephone(initialData.telephone || '');
      setEmailPersonnel(initialData.emailPersonnel || '');
      setPoste(initialData.poste || '');
      setActiveDepartment(
        initialData.activeDepartment
          ? typeof initialData.activeDepartment === 'object'
            ? (initialData.activeDepartment as Department)._id
            : initialData.activeDepartment
          : 'NONE'
      );
      setDateEmbauche(
        initialData.dateEmbauche
          ? new Date(initialData.dateEmbauche).toISOString().split('T')[0]
          : ''
      );
      setNotes(initialData.notes || '');

      // Groupe A
      setNomPere((initialData as any).nomPere || '');
      setNomMere((initialData as any).nomMere || '');
      setNomGrandPere((initialData as any).nomGrandPere || '');
      setGroupeSanguin((initialData as any).groupeSanguin || 'NONE');

      // Groupe B
      setDateEmissionCin(
        (initialData as any).dateEmissionCin
          ? new Date((initialData as any).dateEmissionCin).toISOString().split('T')[0]
          : ''
      );
      setNumeroUnite((initialData as any).numeroUnite || '');
      setNumeroArmee((initialData as any).numeroArmee || '');
      setDateEngagement(
        (initialData as any).dateEngagement
          ? new Date((initialData as any).dateEngagement).toISOString().split('T')[0]
          : ''
      );
      setTypeEngagement((initialData as any).typeEngagement || '');
      setOrigineEngagement((initialData as any).origineEngagement || '');
      setNiveauEtude((initialData as any).niveauEtude || '');
      setDiplomeBase((initialData as any).diplomeBase || '');
      setSpecialite((initialData as any).specialite || '');
      setArme((initialData as any).arme || '');
      setPosteActuel((initialData as any).posteActuel || (initialData as any).poste || '');

      // Groupe C
      setEtatCivil((initialData as any).etatCivil || 'NONE');
      setNomConjoint((initialData as any).nomConjoint || '');
      setDateMariage(
        (initialData as any).dateMariage
          ? new Date((initialData as any).dateMariage).toISOString().split('T')[0]
          : ''
      );
      setNombreEnfants(
        (initialData as any).nombreEnfants ?? (initialData as any).enfants ?? ''
      );

      // Groupe D
      setNumeroPasseport((initialData as any).numeroPasseport || '');
      setDateValiditePasseport(
        (initialData as any).dateValiditePasseport
          ? new Date((initialData as any).dateValiditePasseport).toISOString().split('T')[0]
          : ''
      );

      // Groupe E
      const contacts = (initialData as any).personnesAPrevenir || (initialData as any).contactsUrgence || [];
      setPersonne1({
        nom: contacts[0]?.nom || '',
        lien: contacts[0]?.lien || '',
        telephone: contacts[0]?.telephone || '',
        adresse: contacts[0]?.adresse || '',
      });
      setPersonne2({
        nom: contacts[1]?.nom || '',
        lien: contacts[1]?.lien || '',
        telephone: contacts[1]?.telephone || '',
        adresse: contacts[1]?.adresse || '',
      });
      setPersonne3({
        nom: contacts[2]?.nom || '',
        lien: contacts[2]?.lien || '',
        telephone: contacts[2]?.telephone || '',
        adresse: contacts[2]?.adresse || '',
      });

      setPhoto(initialData.photo || '');
      setPreviewUrl(initialData.photo ? getPhotoUrl(initialData.photo) : '');
      setPhotoFile(null);
      setPhotoError(null);
    }
  }, [initialData]);

  // Récupération des départements pour la sélection
  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: getDepartments,
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation du type de fichier
    if (!file.type.startsWith('image/')) {
      setPhotoError('يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validation de la taille (2 Mo max)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setPhotoError('حجم الصورة يتجاوز الحد الأقصى المسموح به (2 ميغابايت)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemovePhoto = () => {
    setPhoto('');
    setPhotoFile(null);
    setPreviewUrl('');
    setPhotoError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload immédiat optionnel en mode édition
  const handleDirectPhotoUpload = async () => {
    if (!initialData?._id || !photoFile) return;

    try {
      setIsUploadingPhoto(true);
      setPhotoError(null);
      const res = await uploadPersonnelPhoto(initialData._id, photoFile);
      setPhoto(res.photo);
      setPreviewUrl(getPhotoUrl(res.photo));
      setPhotoFile(null);
      toast.success('تم تحديث صورة الموظف بنجاح');
    } catch (err: unknown) {
      console.error('Error uploading photo:', err);
      setPhotoError('حدث خطأ أثناء رفع الصورة، يرجى المحاولة مرة أخرى');
      toast.error('تعذر رفع الصورة');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const validate = () => {
    const newErrors: { nom?: string; prenom?: string } = {};
    if (!nom.trim()) {
      newErrors.nom = 'اللقب إجباري';
    }
    if (!prenom.trim()) {
      newErrors.prenom = 'الاسم إجباري';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const contactsList = [personne1, personne2, personne3].filter(
      (c) => c.nom.trim() || c.telephone.trim() || c.lien.trim() || c.adresse.trim()
    );

    const payload: Partial<Personnel> & Record<string, any> = {
      nom: nom.trim(),
      prenom: prenom.trim(),
      dateNaissance: dateNaissance ? new Date(dateNaissance).toISOString() : null,
      lieuNaissance: lieuNaissance.trim(),
      sexe: sexe !== 'NONE' ? (sexe as PersonnelSexe) : undefined,
      cin: cin.trim(),
      adresse: adresse.trim(),
      telephone: telephone.trim(),
      emailPersonnel: emailPersonnel.trim().toLowerCase(),
      poste: posteActuel.trim() || poste.trim(),
      posteActuel: posteActuel.trim() || poste.trim(),
      activeDepartment: activeDepartment !== 'NONE' ? activeDepartment : null,
      dateEmbauche: dateEmbauche ? new Date(dateEmbauche).toISOString() : null,
      notes: notes.trim(),
      photo: photo,

      // Groupe A — Identité étendue
      nomPere: nomPere.trim(),
      nomMere: nomMere.trim(),
      nomGrandPere: nomGrandPere.trim(),
      groupeSanguin: groupeSanguin !== 'NONE' ? groupeSanguin : '',

      // Groupe B — Situation administrative
      dateEmissionCin: dateEmissionCin ? new Date(dateEmissionCin).toISOString() : null,
      numeroUnite: numeroUnite.trim(),
      numeroArmee: numeroArmee.trim(),
      dateEngagement: dateEngagement ? new Date(dateEngagement).toISOString() : null,
      typeEngagement: typeEngagement.trim(),
      origineEngagement: origineEngagement.trim(),
      niveauEtude: niveauEtude.trim(),
      diplomeBase: diplomeBase.trim(),
      specialite: specialite.trim(),
      arme: arme.trim(),

      // Groupe C — Situation familiale
      etatCivil: etatCivil !== 'NONE' ? etatCivil : '',
      nomConjoint: nomConjoint.trim(),
      dateMariage: dateMariage ? new Date(dateMariage).toISOString() : null,
      nombreEnfants: nombreEnfants !== '' ? Number(nombreEnfants) : 0,
      enfants: nombreEnfants !== '' ? Number(nombreEnfants) : 0,

      // Groupe D — Passeport
      numeroPasseport: numeroPasseport.trim(),
      dateValiditePasseport: dateValiditePasseport ? new Date(dateValiditePasseport).toISOString() : null,

      // Groupe E — 3 personnes à prévenir
      personnesAPrevenir: contactsList,
    };

    onSubmit(payload, photoFile || null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-right" dir="rtl">
      {/* 1. Informations Personnelles & Identité étendue */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#1a202c] border-b border-[#e2e8f0] pb-3 mb-6 flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-[#2c5282]" />
          <span>المعلومات الشخصية والهوية (Identité)</span>
        </h2>

        {/* Zone de téléversement de la photo */}
        <div className="mb-8 p-5 bg-[#f7fafc] border border-[#e2e8f0] rounded">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar circulaire */}
            <div className="relative group shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-[#cbd5e1] overflow-hidden bg-white shadow-sm flex items-center justify-center relative">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="صورة الموظف"
                    className="w-full h-full object-cover"
                    onError={() => setPreviewUrl('')}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#2c5282]/60 bg-[#ebf4ff]/50">
                    <UserIcon className="w-12 h-12" />
                    <span className="text-xs text-gray-500 mt-1 font-medium">بدون صورة</span>
                  </div>
                )}

                {/* Spinner discret de chargement sur l'avatar */}
                {(isUploadingPhoto || (isLoading && Boolean(photoFile))) && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center text-white z-10">
                    <RefreshCw className="w-6 h-6 animate-spin text-white" />
                    <span className="text-[11px] font-medium mt-1">جاري الرفع...</span>
                  </div>
                )}
              </div>

              {/* Bouton rapide d'upload sur l'avatar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isUploadingPhoto}
                title="تغيير الصورة"
                className="absolute bottom-1 right-1 p-2 rounded-full bg-[#2c5282] hover:bg-[#234269] text-white shadow transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Informations et contrôles */}
            <div className="flex-1 text-center sm:text-right space-y-3">
              <div>
                <h3 className="text-base font-bold text-[#1a202c]">صورة الموظف (Photo)</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  الصيغ المدعومة: <strong className="font-semibold text-gray-700">JPG، PNG، WEBP</strong>.
                  الحد الأقصى للحجم: <strong className="font-semibold text-gray-700">2 ميغابايت</strong>.
                  يُفضل استخدام صورة شخصية حديثة مربعة الأبعاد وواضحة الملامح.
                </p>
              </div>

              {/* Input de fichier caché */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handlePhotoSelect}
                className="hidden"
                id="personnel-photo-input"
              />

              {/* Boutons d'action pour la photo */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploadingPhoto}
                  className="h-11 px-4 text-sm font-medium border-[#cbd5e1] text-gray-700 hover:bg-white hover:text-[#2c5282] rounded flex items-center gap-2"
                >
                  <Upload className="w-4 h-4 text-[#2c5282]" />
                  <span>{previewUrl ? 'تغيير الصورة' : 'اختيار صورة'}</span>
                </Button>

                {/* Bouton d'upload direct si fichier sélectionné en mode édition */}
                {initialData?._id && photoFile && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleDirectPhotoUpload}
                    disabled={isUploadingPhoto || isLoading}
                    className="h-11 px-4 text-sm font-medium bg-[#2c5282] hover:bg-[#234269] text-white rounded flex items-center gap-2 shadow-sm"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري الرفع...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>حفظ الصورة الآن</span>
                      </>
                    )}
                  </Button>
                )}

                {/* Bouton de suppression de la photo */}
                {(previewUrl || photo || photoFile) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemovePhoto}
                    disabled={isLoading || isUploadingPhoto}
                    className="h-11 px-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف الصورة</span>
                  </Button>
                )}
              </div>

              {/* Message d'erreur de validation pour la photo */}
              {photoError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{photoError}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="nom" className="text-base font-semibold text-gray-700 flex items-center gap-1">
              <span>اللقب (Nom)</span>
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => {
                setNom(e.target.value);
                if (errors.nom) setErrors((prev) => ({ ...prev, nom: undefined }));
              }}
              placeholder="مثال: بنعلي"
              className={`h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] ${
                errors.nom ? 'border-red-500' : ''
              }`}
            />
            {errors.nom && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.nom}</span>
              </p>
            )}
          </div>

          {/* Prénom */}
          <div className="space-y-2">
            <Label htmlFor="prenom" className="text-base font-semibold text-gray-700 flex items-center gap-1">
              <span>الاسم (Prénom)</span>
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="prenom"
              value={prenom}
              onChange={(e) => {
                setPrenom(e.target.value);
                if (errors.prenom) setErrors((prev) => ({ ...prev, prenom: undefined }));
              }}
              placeholder="مثال: محمد"
              className={`h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] ${
                errors.prenom ? 'border-red-500' : ''
              }`}
            />
            {errors.prenom && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.prenom}</span>
              </p>
            )}
          </div>

          {/* Groupe A : Nom du père */}
          <div className="space-y-2">
            <Label htmlFor="nomPere" className="text-base font-semibold text-gray-700">
              اسم الأب (Nom du père)
            </Label>
            <Input
              id="nomPere"
              value={nomPere}
              onChange={(e) => setNomPere(e.target.value)}
              placeholder="مثال: أحمد"
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Groupe A : Nom du grand-père */}
          <div className="space-y-2">
            <Label htmlFor="nomGrandPere" className="text-base font-semibold text-gray-700">
              اسم الجد (Nom du grand-père)
            </Label>
            <Input
              id="nomGrandPere"
              value={nomGrandPere}
              onChange={(e) => setNomGrandPere(e.target.value)}
              placeholder="مثال: صالح"
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Groupe A : Nom de la mère */}
          <div className="space-y-2">
            <Label htmlFor="nomMere" className="text-base font-semibold text-gray-700">
              اسم الأم (Nom de la mère)
            </Label>
            <Input
              id="nomMere"
              value={nomMere}
              onChange={(e) => setNomMere(e.target.value)}
              placeholder="مثال: فاطمة"
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Sexe */}
          <div className="space-y-2">
            <Label htmlFor="sexe" className="text-base font-semibold text-gray-700">
              الجنس (Sexe)
            </Label>
            <Select value={sexe} onValueChange={(val) => setSexe(val as PersonnelSexe | 'NONE')}>
              <SelectTrigger id="sexe" className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]">
                <SelectValue placeholder="اختر الجنس" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="NONE" className="text-base py-2 font-medium">غير محدد</SelectItem>
                <SelectItem value="Homme" className="text-base py-2">ذكر (Homme)</SelectItem>
                <SelectItem value="Femme" className="text-base py-2">أنثى (Femme)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Groupe A : Groupe sanguin */}
          <div className="space-y-2">
            <Label htmlFor="groupeSanguin" className="text-base font-semibold text-gray-700">
              الفصيلة الدموية (Groupe sanguin)
            </Label>
            <Select value={groupeSanguin} onValueChange={(val) => setGroupeSanguin(val)}>
              <SelectTrigger id="groupeSanguin" className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]">
                <SelectValue placeholder="اختر الفصيلة الدموية" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="NONE" className="text-base py-2 font-medium">غير محدد</SelectItem>
                <SelectItem value="A+" className="text-base py-2 font-semibold">A+</SelectItem>
                <SelectItem value="A-" className="text-base py-2 font-semibold">A-</SelectItem>
                <SelectItem value="B+" className="text-base py-2 font-semibold">B+</SelectItem>
                <SelectItem value="B-" className="text-base py-2 font-semibold">B-</SelectItem>
                <SelectItem value="AB+" className="text-base py-2 font-semibold">AB+</SelectItem>
                <SelectItem value="AB-" className="text-base py-2 font-semibold">AB-</SelectItem>
                <SelectItem value="O+" className="text-base py-2 font-semibold">O+</SelectItem>
                <SelectItem value="O-" className="text-base py-2 font-semibold">O-</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date de naissance */}
          <div className="space-y-2">
            <Label htmlFor="dateNaissance" className="text-base font-semibold text-gray-700">
              تاريخ الازدياد (Date de naissance)
            </Label>
            <Input
              id="dateNaissance"
              type="date"
              value={dateNaissance}
              onChange={(e) => setDateNaissance(e.target.value)}
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Lieu de naissance */}
          <div className="space-y-2">
            <Label htmlFor="lieuNaissance" className="text-base font-semibold text-gray-700">
              مكان الازدياد (Lieu de naissance)
            </Label>
            <Input
              id="lieuNaissance"
              value={lieuNaissance}
              onChange={(e) => setLieuNaissance(e.target.value)}
              placeholder="مثال: تونس العاصمة / صفاقس..."
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* CIN */}
          <div className="space-y-2">
            <Label htmlFor="cin" className="text-base font-semibold text-gray-700">
              رقم بطاقة التعريف الوطنية (CIN)
            </Label>
            <Input
              id="cin"
              value={cin}
              onChange={(e) => setCin(e.target.value)}
              placeholder="مثال: 08123456"
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Groupe B : Date d'émission CIN */}
          <div className="space-y-2">
            <Label htmlFor="dateEmissionCin" className="text-base font-semibold text-gray-700">
              تاريخ إصدار بطاقة التعريف (Émission CIN)
            </Label>
            <Input
              id="dateEmissionCin"
              type="date"
              value={dateEmissionCin}
              onChange={(e) => setDateEmissionCin(e.target.value)}
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Groupe D : Numéro de passeport */}
          <div className="space-y-2">
            <Label htmlFor="numeroPasseport" className="text-base font-semibold text-gray-700">
              رقم جواز السفر (رقم ب.ت.ع / Passeport)
            </Label>
            <Input
              id="numeroPasseport"
              value={numeroPasseport}
              onChange={(e) => setNumeroPasseport(e.target.value)}
              placeholder="مثال: T1234567"
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Groupe D : Date de validité du passeport */}
          <div className="space-y-2">
            <Label htmlFor="dateValiditePasseport" className="text-base font-semibold text-gray-700">
              تاريخ صلوحية جواز السفر (Validité passeport)
            </Label>
            <Input
              id="dateValiditePasseport"
              type="date"
              value={dateValiditePasseport}
              onChange={(e) => setDateValiditePasseport(e.target.value)}
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>
        </div>

        {/* Coordonnées */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 pt-6 border-t border-[#e2e8f0]">
          <div className="space-y-2">
            <Label htmlFor="telephone" className="text-base font-semibold text-gray-700">
              الهاتف (Téléphone)
            </Label>
            <Input
              id="telephone"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="مثال: 98123456"
              dir="ltr"
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailPersonnel" className="text-base font-semibold text-gray-700">
              البريد الإلكتروني الشخصي (Email)
            </Label>
            <Input
              id="emailPersonnel"
              type="email"
              value={emailPersonnel}
              onChange={(e) => setEmailPersonnel(e.target.value)}
              placeholder="exemple@domaine.com"
              dir="ltr"
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] text-right"
            />
          </div>

          <div className="space-y-2 md:col-span-2 lg:col-span-1">
            <Label htmlFor="adresse" className="text-base font-semibold text-gray-700">
              العنوان الشخصي (Adresse)
            </Label>
            <Input
              id="adresse"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              placeholder="العنوان الكامل للإقامة..."
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>
        </div>
      </div>

      {/* 2. Groupe C — Situation Familiale */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#1a202c] border-b border-[#e2e8f0] pb-3 mb-6 flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-600" />
          <span>الحالة العائلية (Situation familiale)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* État civil */}
          <div className="space-y-2">
            <Label htmlFor="etatCivil" className="text-base font-semibold text-gray-700">
              الحالة المدنية (État civil)
            </Label>
            <Select value={etatCivil} onValueChange={(val) => setEtatCivil(val)}>
              <SelectTrigger id="etatCivil" className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]">
                <SelectValue placeholder="اختر الحالة المدنية" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="NONE" className="text-base py-2 font-medium">غير محدد</SelectItem>
                <SelectItem value="celibataire" className="text-base py-2">أعزب / عزباء</SelectItem>
                <SelectItem value="marie" className="text-base py-2 font-semibold text-[#2c5282]">متزوج / متزوجة</SelectItem>
                <SelectItem value="divorce" className="text-base py-2">مطلق / مطلقة</SelectItem>
                <SelectItem value="veuf" className="text-base py-2">أرمل / أرملة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nom du conjoint */}
          <div className="space-y-2">
            <Label htmlFor="nomConjoint" className="text-base font-semibold text-gray-700">
              اسم القرين (Nom du conjoint)
            </Label>
            <Input
              id="nomConjoint"
              value={nomConjoint}
              onChange={(e) => setNomConjoint(e.target.value)}
              placeholder="اسم ولقب الزوج أو الزوجة..."
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Date de mariage */}
          <div className="space-y-2">
            <Label htmlFor="dateMariage" className="text-base font-semibold text-gray-700">
              تاريخ الزواج (Date de mariage)
            </Label>
            <Input
              id="dateMariage"
              type="date"
              value={dateMariage}
              onChange={(e) => setDateMariage(e.target.value)}
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Nombre d'enfants */}
          <div className="space-y-2">
            <Label htmlFor="nombreEnfants" className="text-base font-semibold text-gray-700">
              عدد الأبناء (Nombre d'enfants)
            </Label>
            <Input
              id="nombreEnfants"
              type="number"
              min="0"
              value={nombreEnfants}
              onChange={(e) => setNombreEnfants(e.target.value)}
              placeholder="0"
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>
        </div>
      </div>

      {/* 3. Groupe B — Informations Administratives & Militaires */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#1a202c] border-b border-[#e2e8f0] pb-3 mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#2c5282]" />
          <span>المعلومات المهنية والإدارية (Situation administrative)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Poste actuel (الخطة) */}
          <div className="space-y-2">
            <Label htmlFor="posteActuel" className="text-base font-semibold text-gray-700">
              الخطة / المنصب الحالي (Poste actuel)
            </Label>
            <Input
              id="posteActuel"
              value={posteActuel}
              onChange={(e) => {
                setPosteActuel(e.target.value);
                setPoste(e.target.value);
              }}
              placeholder="مثال: رئيس مصلحة / متصرف..."
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Département principal */}
          <div className="space-y-2">
            <Label htmlFor="activeDepartment" className="text-base font-semibold text-gray-700">
              القسم الرئيسي (Département)
            </Label>
            <Select
              value={activeDepartment}
              onValueChange={(val) => setActiveDepartment(val)}
              disabled={isLoadingDepartments}
            >
              <SelectTrigger id="activeDepartment" className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]">
                <SelectValue placeholder="اختر القسم" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="NONE" className="text-base py-2 font-medium">غير محدد</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept._id} value={dept._id} className="text-base py-2">
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date d'embauche */}
          <div className="space-y-2">
            <Label htmlFor="dateEmbauche" className="text-base font-semibold text-gray-700">
              تاريخ التعيين أو الالتحاق (Date d'embauche)
            </Label>
            <Input
              id="dateEmbauche"
              type="date"
              value={dateEmbauche}
              onChange={(e) => setDateEmbauche(e.target.value)}
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Numéro d'unité */}
          <div className="space-y-2">
            <Label htmlFor="numeroUnite" className="text-base font-semibold text-gray-700">
              رقم الوحدة (Numéro d'unité)
            </Label>
            <Input
              id="numeroUnite"
              value={numeroUnite}
              onChange={(e) => setNumeroUnite(e.target.value)}
              placeholder="مثال: 104"
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Numéro d'armée */}
          <div className="space-y-2">
            <Label htmlFor="numeroArmee" className="text-base font-semibold text-gray-700">
              الرقم العسكري (Numéro d'armée)
            </Label>
            <Input
              id="numeroArmee"
              value={numeroArmee}
              onChange={(e) => setNumeroArmee(e.target.value)}
              placeholder="مثال: 12345/A"
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Date d'engagement */}
          <div className="space-y-2">
            <Label htmlFor="dateEngagement" className="text-base font-semibold text-gray-700">
              تاريخ الانخراط (Date d'engagement)
            </Label>
            <Input
              id="dateEngagement"
              type="date"
              value={dateEngagement}
              onChange={(e) => setDateEngagement(e.target.value)}
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Type d'engagement */}
          <div className="space-y-2">
            <Label htmlFor="typeEngagement" className="text-base font-semibold text-gray-700">
              نوع الانخراط (Type d'engagement)
            </Label>
            <Input
              id="typeEngagement"
              value={typeEngagement}
              onChange={(e) => setTypeEngagement(e.target.value)}
              placeholder="مثال: مباشر / متعاقد / تطوع..."
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Origine d'engagement */}
          <div className="space-y-2">
            <Label htmlFor="origineEngagement" className="text-base font-semibold text-gray-700">
              أصل الانخراط (Origine d'engagement)
            </Label>
            <Input
              id="origineEngagement"
              value={origineEngagement}
              onChange={(e) => setOrigineEngagement(e.target.value)}
              placeholder="مثال: الأكاديمية العسكرية / مدرسة الرقباء..."
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Niveau d'étude */}
          <div className="space-y-2">
            <Label htmlFor="niveauEtude" className="text-base font-semibold text-gray-700">
              المستوى الدراسي (Niveau d'étude)
            </Label>
            <Input
              id="niveauEtude"
              value={niveauEtude}
              onChange={(e) => setNiveauEtude(e.target.value)}
              placeholder="مثال: تعليم عالي / باكالوريا..."
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Diplôme de base (المؤهل) */}
          <div className="space-y-2">
            <Label htmlFor="diplomeBase" className="text-base font-semibold text-gray-700">
              المؤهل / الشهادة الأساسية (المؤهل)
            </Label>
            <Input
              id="diplomeBase"
              value={diplomeBase}
              onChange={(e) => setDiplomeBase(e.target.value)}
              placeholder="مثال: إجازة تطبيقية / ماجستير / مؤهل ضابط..."
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Spécialité (الإختصاص) */}
          <div className="space-y-2">
            <Label htmlFor="specialite" className="text-base font-semibold text-gray-700">
              الإختصاص (Spécialité)
            </Label>
            <Input
              id="specialite"
              value={specialite}
              onChange={(e) => setSpecialite(e.target.value)}
              placeholder="مثال: إعلامية / اتصالات / لوجستيك..."
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Arme (السلاح) */}
          <div className="space-y-2">
            <Label htmlFor="arme" className="text-base font-semibold text-gray-700">
              السلاح (Arme)
            </Label>
            <Input
              id="arme"
              value={arme}
              onChange={(e) => setArme(e.target.value)}
              placeholder="مثال: الإشارة / المشاة / النقل..."
              className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2 mt-6 pt-6 border-t border-[#e2e8f0]">
          <Label htmlFor="notes" className="text-base font-semibold text-gray-700">
            ملاحظات إضافية (Notes)
          </Label>
          <Textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات أو تعليقات تخص ملف الموظف..."
            className="text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>
      </div>

      {/* 4. Groupe E — 3 personnes à prévenir */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#1a202c] border-b border-[#e2e8f0] pb-3 mb-6 flex items-center gap-2">
          <PhoneCall className="w-5 h-5 text-amber-600" />
          <span>الأشخاص الواجب إعلامهم عند الطوارئ (3 personnes à prévenir)</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personne 1 */}
          <div className="border border-[#cbd5e1] rounded-lg p-4 bg-[#f8fafc] space-y-4">
            <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-2">
              <span className="w-6 h-6 rounded-full bg-[#2c5282] text-white flex items-center justify-center text-xs font-bold">1</span>
              <h3 className="font-bold text-gray-800 text-sm">الشخص الأول (Personne 1)</h3>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p1-nom" className="text-xs font-semibold text-gray-700">الاسم واللقب</Label>
              <Input
                id="p1-nom"
                value={personne1.nom}
                onChange={(e) => setPersonne1({ ...personne1, nom: e.target.value })}
                placeholder="اسم ولقب الشخص..."
                className="h-10 text-sm bg-white border-[#cbd5e1]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p1-lien" className="text-xs font-semibold text-gray-700">صلة القرابة</Label>
              <Input
                id="p1-lien"
                value={personne1.lien}
                onChange={(e) => setPersonne1({ ...personne1, lien: e.target.value })}
                placeholder="مثال: أب / زوجة / أخ..."
                className="h-10 text-sm bg-white border-[#cbd5e1]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p1-tel" className="text-xs font-semibold text-gray-700">رقم الهاتف</Label>
              <Input
                id="p1-tel"
                value={personne1.telephone}
                onChange={(e) => setPersonne1({ ...personne1, telephone: e.target.value })}
                placeholder="مثال: 98123456"
                dir="ltr"
                className="h-10 text-sm bg-white border-[#cbd5e1] text-right"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p1-adr" className="text-xs font-semibold text-gray-700">العنوان</Label>
              <Input
                id="p1-adr"
                value={personne1.adresse}
                onChange={(e) => setPersonne1({ ...personne1, adresse: e.target.value })}
                placeholder="عنوان الإقامة..."
                className="h-10 text-sm bg-white border-[#cbd5e1]"
              />
            </div>
          </div>

          {/* Personne 2 */}
          <div className="border border-[#cbd5e1] rounded-lg p-4 bg-[#f8fafc] space-y-4">
            <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-2">
              <span className="w-6 h-6 rounded-full bg-[#2c5282] text-white flex items-center justify-center text-xs font-bold">2</span>
              <h3 className="font-bold text-gray-800 text-sm">الشخص الثاني (Personne 2)</h3>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p2-nom" className="text-xs font-semibold text-gray-700">الاسم واللقب</Label>
              <Input
                id="p2-nom"
                value={personne2.nom}
                onChange={(e) => setPersonne2({ ...personne2, nom: e.target.value })}
                placeholder="اسم ولقب الشخص..."
                className="h-10 text-sm bg-white border-[#cbd5e1]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p2-lien" className="text-xs font-semibold text-gray-700">صلة القرابة</Label>
              <Input
                id="p2-lien"
                value={personne2.lien}
                onChange={(e) => setPersonne2({ ...personne2, lien: e.target.value })}
                placeholder="مثال: أم / أخت / صديق..."
                className="h-10 text-sm bg-white border-[#cbd5e1]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p2-tel" className="text-xs font-semibold text-gray-700">رقم الهاتف</Label>
              <Input
                id="p2-tel"
                value={personne2.telephone}
                onChange={(e) => setPersonne2({ ...personne2, telephone: e.target.value })}
                placeholder="مثال: 98123456"
                dir="ltr"
                className="h-10 text-sm bg-white border-[#cbd5e1] text-right"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p2-adr" className="text-xs font-semibold text-gray-700">العنوان</Label>
              <Input
                id="p2-adr"
                value={personne2.adresse}
                onChange={(e) => setPersonne2({ ...personne2, adresse: e.target.value })}
                placeholder="عنوان الإقامة..."
                className="h-10 text-sm bg-white border-[#cbd5e1]"
              />
            </div>
          </div>

          {/* Personne 3 */}
          <div className="border border-[#cbd5e1] rounded-lg p-4 bg-[#f8fafc] space-y-4">
            <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-2">
              <span className="w-6 h-6 rounded-full bg-[#2c5282] text-white flex items-center justify-center text-xs font-bold">3</span>
              <h3 className="font-bold text-gray-800 text-sm">الشخص الثالث (Personne 3)</h3>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p3-nom" className="text-xs font-semibold text-gray-700">الاسم واللقب</Label>
              <Input
                id="p3-nom"
                value={personne3.nom}
                onChange={(e) => setPersonne3({ ...personne3, nom: e.target.value })}
                placeholder="اسم ولقب الشخص..."
                className="h-10 text-sm bg-white border-[#cbd5e1]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p3-lien" className="text-xs font-semibold text-gray-700">صلة القرابة</Label>
              <Input
                id="p3-lien"
                value={personne3.lien}
                onChange={(e) => setPersonne3({ ...personne3, lien: e.target.value })}
                placeholder="مثال: قريب / جار..."
                className="h-10 text-sm bg-white border-[#cbd5e1]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p3-tel" className="text-xs font-semibold text-gray-700">رقم الهاتف</Label>
              <Input
                id="p3-tel"
                value={personne3.telephone}
                onChange={(e) => setPersonne3({ ...personne3, telephone: e.target.value })}
                placeholder="مثال: 98123456"
                dir="ltr"
                className="h-10 text-sm bg-white border-[#cbd5e1] text-right"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p3-adr" className="text-xs font-semibold text-gray-700">العنوان</Label>
              <Input
                id="p3-adr"
                value={personne3.adresse}
                onChange={(e) => setPersonne3({ ...personne3, adresse: e.target.value })}
                placeholder="عنوان الإقامة..."
                className="h-10 text-sm bg-white border-[#cbd5e1]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Boutons d'action */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-[#e2e8f0]">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="h-11 px-6 text-base font-medium text-gray-700 border-gray-300 hover:bg-gray-100 rounded flex items-center gap-2"
        >
          <X className="w-5 h-5" />
          <span>إلغاء</span>
        </Button>

        <Button
          type="submit"
          disabled={isLoading}
          className="h-11 px-8 text-base font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          <span>{isLoading ? 'جاري الحفظ...' : 'حفظ'}</span>
        </Button>
      </div>
    </form>
  );
};

export default PersonnelForm;

