import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { getDepartments } from '@/services/departmentService';
import { Department } from '@/types';
import { Personnel, PersonnelSexe } from '@/types/hr';
import { uploadPersonnelPhoto, getPhotoUrl } from '@/services/hr/personnelApi';
import { useDirection } from '@/i18n/useDirection';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Heart,
  Shield,
  PhoneCall,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

import { Step1Identity } from './wizard/Step1Identity';
import { Step2Family } from './wizard/Step2Family';
import { Step3Admin } from './wizard/Step3Admin';
import { Step4Contacts } from './wizard/Step4Contacts';

export interface PersonnelFormErrors {
  nom?: string;
  prenom?: string;
  cin?: string;
  telephone?: string;
  emailPersonnel?: string;
  dateEmbauche?: string;
}

const getTodayLocalIso = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface ContactUrgenceItem {
  nom: string;
  lien: string;
  telephone: string;
  adresse: string;
}

export interface PersonnelExtendedData extends Partial<Personnel> {
  nomPere?: string;
  nomMere?: string;
  nomGrandPere?: string;
  groupeSanguin?: string;
  dateEmissionCin?: string | Date | null;
  numeroUnite?: string;
  numeroArmee?: string;
  dateEngagement?: string | Date | null;
  typeEngagement?: string;
  origineEngagement?: string;
  niveauEtude?: string;
  diplomeBase?: string;
  specialite?: string;
  arme?: string;
  posteActuel?: string;
  etatCivil?: string;
  nomConjoint?: string;
  dateMariage?: string | Date | null;
  nombreEnfants?: string | number;
  enfants?: string | number;
  numeroPasseport?: string;
  dateValiditePasseport?: string | Date | null;
  personnesAPrevenir?: ContactUrgenceItem[];
  contactsUrgence?: ContactUrgenceItem[];
  [key: string]: unknown;
}

interface PersonnelFormProps {
  initialData?: PersonnelExtendedData;
  onSubmit: (data: PersonnelExtendedData, photoFile?: File | null) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const PersonnelForm: React.FC<PersonnelFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const { isRTL: isRtl } = useDirection();

  const { personnelStep1Schema, personnelFullSchema } = useMemo(() => {
    const step1 = z.object({
      nom: z.string().trim().min(1, t('hr.form.validation.nomRequired')),
      prenom: z.string().trim().min(1, t('hr.form.validation.prenomRequired')),
      cin: z
        .string()
        .trim()
        .regex(/^\d{8}$/, t('hr.form.validation.cinLength')),
      telephone: z
        .string()
        .trim()
        .regex(/^\d{8}$/, t('hr.form.validation.telephoneLength')),
      emailPersonnel: z
        .string()
        .trim()
        .refine(
          (val) => val === '' || z.string().email().safeParse(val).success,
          t('hr.form.validation.emailInvalid')
        ),
    });

    const full = step1.extend({
      dateEmbauche: z
        .string()
        .trim()
        .refine(
          (val) => !val || val <= getTodayLocalIso(),
          t('hr.form.validation.hireDateFuture')
        ),
    });

    return { personnelStep1Schema: step1, personnelFullSchema: full };
  }, [t]);

  // État du wizard multi-étapes
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Informations de base
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
  const [nomPere, setNomPere] = useState(initialData?.nomPere || '');
  const [nomMere, setNomMere] = useState(initialData?.nomMere || '');
  const [nomGrandPere, setNomGrandPere] = useState(initialData?.nomGrandPere || '');
  const [groupeSanguin, setGroupeSanguin] = useState<string>(initialData?.groupeSanguin || 'NONE');

  // Groupe B — Situation administrative
  const [dateEmissionCin, setDateEmissionCin] = useState(
    initialData?.dateEmissionCin
      ? new Date(initialData.dateEmissionCin).toISOString().split('T')[0]
      : ''
  );
  const [numeroUnite, setNumeroUnite] = useState(initialData?.numeroUnite || '');
  const [numeroArmee, setNumeroArmee] = useState(initialData?.numeroArmee || '');
  const [dateEngagement, setDateEngagement] = useState(
    initialData?.dateEngagement
      ? new Date(initialData.dateEngagement).toISOString().split('T')[0]
      : ''
  );
  const [typeEngagement, setTypeEngagement] = useState(initialData?.typeEngagement || '');
  const [origineEngagement, setOrigineEngagement] = useState(initialData?.origineEngagement || '');
  const [niveauEtude, setNiveauEtude] = useState(initialData?.niveauEtude || '');
  const [diplomeBase, setDiplomeBase] = useState(initialData?.diplomeBase || '');
  const [specialite, setSpecialite] = useState(initialData?.specialite || '');
  const [arme, setArme] = useState(initialData?.arme || '');
  const [posteActuel, setPosteActuel] = useState(initialData?.posteActuel || initialData?.poste || '');

  // Groupe C — Situation familiale
  const [etatCivil, setEtatCivil] = useState<string>(initialData?.etatCivil || 'NONE');
  const [nomConjoint, setNomConjoint] = useState(initialData?.nomConjoint || '');
  const [dateMariage, setDateMariage] = useState(
    initialData?.dateMariage ? new Date(initialData.dateMariage).toISOString().split('T')[0] : ''
  );
  const [nombreEnfants, setNombreEnfants] = useState<string | number>(
    initialData?.nombreEnfants ?? initialData?.enfants ?? ''
  );

  // Groupe D — Passeport
  const [numeroPasseport, setNumeroPasseport] = useState(initialData?.numeroPasseport || '');
  const [dateValiditePasseport, setDateValiditePasseport] = useState(
    initialData?.dateValiditePasseport
      ? new Date(initialData.dateValiditePasseport).toISOString().split('T')[0]
      : ''
  );

  // Groupe E — 3 personnes à prévenir
  const initialContacts = initialData?.personnesAPrevenir || initialData?.contactsUrgence || [];
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

  const [errors, setErrors] = useState<PersonnelFormErrors>({});

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
      setNomPere(initialData.nomPere || '');
      setNomMere(initialData.nomMere || '');
      setNomGrandPere(initialData.nomGrandPere || '');
      setGroupeSanguin(initialData.groupeSanguin || 'NONE');

      // Groupe B
      setDateEmissionCin(
        initialData.dateEmissionCin
          ? new Date(initialData.dateEmissionCin).toISOString().split('T')[0]
          : ''
      );
      setNumeroUnite(initialData.numeroUnite || '');
      setNumeroArmee(initialData.numeroArmee || '');
      setDateEngagement(
        initialData.dateEngagement
          ? new Date(initialData.dateEngagement).toISOString().split('T')[0]
          : ''
      );
      setTypeEngagement(initialData.typeEngagement || '');
      setOrigineEngagement(initialData.origineEngagement || '');
      setNiveauEtude(initialData.niveauEtude || '');
      setDiplomeBase(initialData.diplomeBase || '');
      setSpecialite(initialData.specialite || '');
      setArme(initialData.arme || '');
      setPosteActuel(initialData.posteActuel || initialData.poste || '');

      // Groupe C
      setEtatCivil(initialData.etatCivil || 'NONE');
      setNomConjoint(initialData.nomConjoint || '');
      setDateMariage(
        initialData.dateMariage
          ? new Date(initialData.dateMariage).toISOString().split('T')[0]
          : ''
      );
      setNombreEnfants(
        initialData.nombreEnfants ?? initialData.enfants ?? ''
      );

      // Groupe D
      setNumeroPasseport(initialData.numeroPasseport || '');
      setDateValiditePasseport(
        initialData.dateValiditePasseport
          ? new Date(initialData.dateValiditePasseport).toISOString().split('T')[0]
          : ''
      );

      // Groupe E
      const contacts = initialData.personnesAPrevenir || initialData.contactsUrgence || [];
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
      setPhotoError(t('hr.form.photo.invalidType'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validation de la taille (2 Mo max)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setPhotoError(t('hr.form.photo.maxSize'));
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
      toast.success(t('hr.form.photo.uploadSuccess'));
    } catch (err: unknown) {
      console.error('Error uploading photo:', err);
      setPhotoError(t('hr.form.photo.uploadError'));
      toast.error(t('hr.form.photo.uploadFailed'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const mapZodIssuesToErrors = (issues: z.ZodIssue[]): PersonnelFormErrors => {
    const mapped: PersonnelFormErrors = {};
    for (const issue of issues) {
      const field = issue.path[0] as keyof PersonnelFormErrors | undefined;
      if (field && !mapped[field]) {
        mapped[field] = issue.message;
      }
    }
    return mapped;
  };

  const validateStep1 = () => {
    const result = personnelStep1Schema.safeParse({
      nom,
      prenom,
      cin,
      telephone,
      emailPersonnel,
    });
    if (!result.success) {
      const fieldErrors = mapZodIssuesToErrors(result.error.issues);
      setErrors((prev) => ({
        ...prev,
        nom: undefined,
        prenom: undefined,
        cin: undefined,
        telephone: undefined,
        emailPersonnel: undefined,
        ...fieldErrors,
      }));
      const firstMessage = result.error.issues[0]?.message || t('hr.form.validation.requiredStep1');
      toast.error(firstMessage);
      return false;
    }
    setErrors((prev) => ({
      ...prev,
      nom: undefined,
      prenom: undefined,
      cin: undefined,
      telephone: undefined,
      emailPersonnel: undefined,
    }));
    return true;
  };

  const validate = () => {
    const result = personnelFullSchema.safeParse({
      nom,
      prenom,
      cin,
      telephone,
      emailPersonnel,
      dateEmbauche,
    });
    if (!result.success) {
      const fieldErrors = mapZodIssuesToErrors(result.error.issues);
      setErrors(fieldErrors);
      const hasStep1Errors = Boolean(
        fieldErrors.nom ||
          fieldErrors.prenom ||
          fieldErrors.cin ||
          fieldErrors.telephone ||
          fieldErrors.emailPersonnel
      );
      if (hasStep1Errors) {
        setCurrentStep(1);
      } else if (fieldErrors.dateEmbauche) {
        setCurrentStep(3);
      }
      const firstMessage = result.error.issues[0]?.message || t('hr.form.validation.requiredStep1');
      toast.error(firstMessage);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !validateStep1()) {
      return;
    }
    if (currentStep === 3 && dateEmbauche && dateEmbauche > getTodayLocalIso()) {
      const msg = t('hr.form.validation.hireDateFuture');
      setErrors((prev) => ({ ...prev, dateEmbauche: msg }));
      toast.error(msg);
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex > currentStep && currentStep === 1 && !validateStep1()) {
      return;
    }
    setCurrentStep(stepIndex);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    const contactsList = [personne1, personne2, personne3].filter(
      (c) => c.nom.trim() || c.telephone.trim() || c.lien.trim() || c.adresse.trim()
    );

    const payload: PersonnelExtendedData = {
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

  const steps = [
    { id: 1, title: t('hr.form.steps.identity'), icon: UserIcon },
    { id: 2, title: t('hr.form.steps.family'), icon: Heart },
    { id: 3, title: t('hr.form.steps.admin'), icon: Shield },
    { id: 4, title: t('hr.form.steps.contacts'), icon: PhoneCall },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Wizard Header & Stepper */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        {/* Step indicator header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#2c5282] text-white flex items-center justify-center font-bold text-sm shadow-sm tabular-nums">
              {currentStep}
            </span>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                {steps[currentStep - 1]?.title}
              </h2>
              <p className="text-xs text-muted-foreground tabular-nums">
                {t('hr.form.steps.stepCount', { current: currentStep, total: 4 })}
              </p>
            </div>
          </div>
          <div className="w-full sm:w-48">
            <Progress value={(currentStep / 4) * 100} className="h-2" />
          </div>
        </div>

        {/* 4 Interactive step tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {steps.map((step) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleStepClick(step.id)}
                className={`flex items-center gap-2.5 p-3 rounded-lg border text-start transition-all ${
                  isCurrent
                    ? 'border-[#2c5282] dark:border-blue-600 bg-blue-50/90 dark:bg-blue-950/50 text-[#1e3a8a] dark:text-blue-200 shadow-xs'
                    : isCompleted
                    ? 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-emerald-800 dark:text-emerald-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    isCurrent
                      ? 'bg-[#2c5282] text-white'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <div className="truncate">
                  <span className="text-[11px] block font-medium opacity-75 tabular-nums">
                    {t('hr.form.steps.stepCount', { current: step.id, total: 4 })}
                  </span>
                  <span className="text-xs font-semibold truncate block">
                    {step.title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Wizard Steps Content */}
      <div className="transition-all duration-200">
        {currentStep === 1 && (
          <Step1Identity
            nom={nom}
            setNom={setNom}
            prenom={prenom}
            setPrenom={setPrenom}
            nomPere={nomPere}
            setNomPere={setNomPere}
            nomGrandPere={nomGrandPere}
            setNomGrandPere={setNomGrandPere}
            nomMere={nomMere}
            setNomMere={setNomMere}
            sexe={sexe}
            setSexe={setSexe}
            groupeSanguin={groupeSanguin}
            setGroupeSanguin={setGroupeSanguin}
            dateNaissance={dateNaissance}
            setDateNaissance={setDateNaissance}
            lieuNaissance={lieuNaissance}
            setLieuNaissance={setLieuNaissance}
            cin={cin}
            setCin={setCin}
            dateEmissionCin={dateEmissionCin}
            setDateEmissionCin={setDateEmissionCin}
            numeroPasseport={numeroPasseport}
            setNumeroPasseport={setNumeroPasseport}
            dateValiditePasseport={dateValiditePasseport}
            setDateValiditePasseport={setDateValiditePasseport}
            telephone={telephone}
            setTelephone={setTelephone}
            emailPersonnel={emailPersonnel}
            setEmailPersonnel={setEmailPersonnel}
            adresse={adresse}
            setAdresse={setAdresse}
            photo={photo}
            previewUrl={previewUrl}
            photoFile={photoFile}
            isUploadingPhoto={isUploadingPhoto}
            isLoading={isLoading}
            photoError={photoError}
            fileInputRef={fileInputRef}
            handlePhotoSelect={handlePhotoSelect}
            handleRemovePhoto={handleRemovePhoto}
            handleDirectPhotoUpload={handleDirectPhotoUpload}
            initialData={initialData}
            errors={errors}
            setErrors={setErrors}
          />
        )}

        {currentStep === 2 && (
          <Step2Family
            etatCivil={etatCivil}
            setEtatCivil={setEtatCivil}
            nomConjoint={nomConjoint}
            setNomConjoint={setNomConjoint}
            dateMariage={dateMariage}
            setDateMariage={setDateMariage}
            nombreEnfants={nombreEnfants}
            setNombreEnfants={setNombreEnfants}
          />
        )}

        {currentStep === 3 && (
          <Step3Admin
            posteActuel={posteActuel}
            setPosteActuel={setPosteActuel}
            poste={poste}
            setPoste={setPoste}
            activeDepartment={activeDepartment}
            setActiveDepartment={setActiveDepartment}
            departments={departments}
            isLoadingDepartments={isLoadingDepartments}
            dateEmbauche={dateEmbauche}
            setDateEmbauche={setDateEmbauche}
            numeroUnite={numeroUnite}
            setNumeroUnite={setNumeroUnite}
            numeroArmee={numeroArmee}
            setNumeroArmee={setNumeroArmee}
            dateEngagement={dateEngagement}
            setDateEngagement={setDateEngagement}
            typeEngagement={typeEngagement}
            setTypeEngagement={setTypeEngagement}
            origineEngagement={origineEngagement}
            setOrigineEngagement={setOrigineEngagement}
            niveauEtude={niveauEtude}
            setNiveauEtude={setNiveauEtude}
            diplomeBase={diplomeBase}
            setDiplomeBase={setDiplomeBase}
            specialite={specialite}
            setSpecialite={setSpecialite}
            arme={arme}
            setArme={setArme}
            notes={notes}
            setNotes={setNotes}
            errors={errors}
            setErrors={setErrors}
          />
        )}

        {currentStep === 4 && (
          <Step4Contacts
            personne1={personne1}
            setPersonne1={setPersonne1}
            personne2={personne2}
            setPersonne2={setPersonne2}
            personne3={personne3}
            setPersonne3={setPersonne3}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm">
        {/* Annuler */}
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="h-11 px-5 text-sm font-medium text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          <span>{t('hr.form.nav.cancel')}</span>
        </Button>

        {/* Stepper buttons (Précédent / Suivant / Enregistrer) */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevStep}
            disabled={currentStep === 1 || isLoading}
            className="h-11 px-5 text-sm font-medium text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 disabled:opacity-40"
          >
            {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            <span>{t('hr.form.nav.previous')}</span>
          </Button>

          {currentStep < 4 ? (
            <Button
              type="button"
              onClick={handleNextStep}
              disabled={isLoading}
              className="h-11 px-6 text-sm font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg flex items-center gap-2 shadow-xs"
            >
              <span>{t('hr.form.nav.next')}</span>
              {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 px-7 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? t('hr.form.nav.saving') : t('hr.form.nav.save')}</span>
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};

export default PersonnelForm;
