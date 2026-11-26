import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  Camera,
  Upload,
  Trash2,
  User as UserIcon,
  RefreshCw,
  Save,
} from 'lucide-react';
import { PersonnelSexe } from '@/types/hr';
import { useDirection } from '@/i18n/useDirection';
import { PersonnelExtendedData, PersonnelFormErrors } from '../PersonnelForm';

export interface Step1IdentityProps {
  nom: string;
  setNom: (val: string) => void;
  prenom: string;
  setPrenom: (val: string) => void;
  nomPere: string;
  setNomPere: (val: string) => void;
  nomGrandPere: string;
  setNomGrandPere: (val: string) => void;
  nomMere: string;
  setNomMere: (val: string) => void;
  sexe: PersonnelSexe | 'NONE';
  setSexe: (val: PersonnelSexe | 'NONE') => void;
  groupeSanguin: string;
  setGroupeSanguin: (val: string) => void;
  dateNaissance: string;
  setDateNaissance: (val: string) => void;
  lieuNaissance: string;
  setLieuNaissance: (val: string) => void;
  cin: string;
  setCin: (val: string) => void;
  dateEmissionCin: string;
  setDateEmissionCin: (val: string) => void;
  numeroPasseport: string;
  setNumeroPasseport: (val: string) => void;
  dateValiditePasseport: string;
  setDateValiditePasseport: (val: string) => void;
  telephone: string;
  setTelephone: (val: string) => void;
  emailPersonnel: string;
  setEmailPersonnel: (val: string) => void;
  adresse: string;
  setAdresse: (val: string) => void;
  photo: string;
  previewUrl: string;
  photoFile: File | null;
  isUploadingPhoto: boolean;
  isLoading: boolean;
  photoError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handlePhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemovePhoto: () => void;
  handleDirectPhotoUpload: () => void;
  initialData?: PersonnelExtendedData;
  errors: PersonnelFormErrors;
  setErrors: React.Dispatch<React.SetStateAction<PersonnelFormErrors>>;
}

export const Step1Identity: React.FC<Step1IdentityProps> = ({
  nom,
  setNom,
  prenom,
  setPrenom,
  nomPere,
  setNomPere,
  nomGrandPere,
  setNomGrandPere,
  nomMere,
  setNomMere,
  sexe,
  setSexe,
  groupeSanguin,
  setGroupeSanguin,
  dateNaissance,
  setDateNaissance,
  lieuNaissance,
  setLieuNaissance,
  cin,
  setCin,
  dateEmissionCin,
  setDateEmissionCin,
  numeroPasseport,
  setNumeroPasseport,
  dateValiditePasseport,
  setDateValiditePasseport,
  telephone,
  setTelephone,
  emailPersonnel,
  setEmailPersonnel,
  adresse,
  setAdresse,
  photo,
  previewUrl,
  photoFile,
  isUploadingPhoto,
  isLoading,
  photoError,
  fileInputRef,
  handlePhotoSelect,
  handleRemovePhoto,
  handleDirectPhotoUpload,
  initialData,
  errors,
  setErrors,
}) => {
  const { t } = useTranslation();
  const { dir, isRTL } = useDirection();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 pb-3 mb-6 flex items-center gap-2">
        <UserIcon className="w-5 h-5 text-[#2c5282] dark:text-blue-400" />
        <span>{t('hr.form.identity.sectionTitle')}</span>
      </h2>

      {/* Zone de téléversement de la photo */}
      <div className="mb-8 p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 rounded-lg">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar circulaire */}
          <div className="relative group shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-slate-300 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center relative">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={t('hr.form.photo.alt')}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#2c5282]/70 dark:text-blue-300/70 bg-blue-50/50 dark:bg-blue-950/30">
                  <UserIcon className="w-12 h-12" />
                  <span className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-medium">{t('hr.form.photo.noPhoto')}</span>
                </div>
              )}

              {/* Spinner discret de chargement sur l'avatar */}
              {(isUploadingPhoto || (isLoading && Boolean(photoFile))) && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center text-white z-10">
                  <RefreshCw className="w-6 h-6 animate-spin text-white" />
                  <span className="text-[13px] font-medium mt-1">{t('hr.form.photo.uploading')}</span>
                </div>
              )}
            </div>

            {/* Bouton rapide d'upload sur l'avatar */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploadingPhoto}
              title={t('hr.form.photo.changeTooltip')}
              className="absolute bottom-1 end-1 p-2 rounded-full bg-[#2c5282] hover:bg-[#234269] text-white shadow transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Informations et contrôles */}
          <div className="flex-1 text-center sm:text-start space-y-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('hr.form.photo.title')}</h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                {t('hr.form.photo.formatsHintPrefix')}{' '}
                <strong className="font-semibold text-slate-700 dark:text-slate-200">{t('hr.form.photo.formatsValue')}</strong>.{' '}
                {t('hr.form.photo.maxSizeHintPrefix')}{' '}
                <strong className="font-semibold text-slate-700 dark:text-slate-200">{t('hr.form.photo.maxSizeValue')}</strong>.{' '}
                {t('hr.form.photo.recommendation')}
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
                className="h-11 px-4 text-sm font-medium border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:text-[#2c5282] dark:hover:text-blue-300 rounded-lg flex items-center gap-2"
              >
                <Upload className="w-4 h-4 text-[#2c5282] dark:text-blue-400" />
                <span>{previewUrl ? t('hr.form.photo.change') : t('hr.form.photo.choose')}</span>
              </Button>

              {/* Bouton d'upload direct si fichier sélectionné en mode édition */}
              {initialData?._id && photoFile && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleDirectPhotoUpload}
                  disabled={isUploadingPhoto || isLoading}
                  className="h-11 px-4 text-sm font-medium bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg flex items-center gap-2 shadow-sm"
                >
                  {isUploadingPhoto ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('hr.form.photo.uploading')}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{t('hr.form.photo.saveNow')}</span>
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
                  className="h-11 px-3 text-sm text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t('hr.form.photo.remove')}</span>
                </Button>
              )}
            </div>

            {/* Message d'erreur de validation pour la photo */}
            {photoError && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg p-2 mt-2">
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
          <Label htmlFor="nom" className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <span>{t('hr.form.identity.nom.label')}</span>
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="nom"
            value={nom}
            onChange={(e) => {
              setNom(e.target.value);
              if (errors.nom) setErrors((prev) => ({ ...prev, nom: undefined }));
            }}
            placeholder={t('hr.form.identity.nom.placeholder')}
            className={`h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] ${
              errors.nom ? 'border-red-500' : ''
            }`}
          />
          {errors.nom && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              <span>{errors.nom}</span>
            </p>
          )}
        </div>

        {/* Prénom */}
        <div className="space-y-2">
          <Label htmlFor="prenom" className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <span>{t('hr.form.identity.prenom.label')}</span>
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="prenom"
            value={prenom}
            onChange={(e) => {
              setPrenom(e.target.value);
              if (errors.prenom) setErrors((prev) => ({ ...prev, prenom: undefined }));
            }}
            placeholder={t('hr.form.identity.prenom.placeholder')}
            className={`h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] ${
              errors.prenom ? 'border-red-500' : ''
            }`}
          />
          {errors.prenom && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              <span>{errors.prenom}</span>
            </p>
          )}
        </div>

        {/* Groupe A : Nom du père */}
        <div className="space-y-2">
          <Label htmlFor="nomPere" className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {t('hr.form.identity.nomPere.label')}
          </Label>
          <Input
            id="nomPere"
            value={nomPere}
            onChange={(e) => setNomPere(e.target.value)}
            placeholder={t('hr.form.identity.nomPere.placeholder')}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Groupe A : Nom du grand-père */}
        <div className="space-y-2">
          <Label htmlFor="nomGrandPere" className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {t('hr.form.identity.nomGrandPere.label')}
          </Label>
          <Input
            id="nomGrandPere"
            value={nomGrandPere}
            onChange={(e) => setNomGrandPere(e.target.value)}
            placeholder={t('hr.form.identity.nomGrandPere.placeholder')}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Groupe A : Nom de la mère */}
        <div className="space-y-2">
          <Label htmlFor="nomMere" className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {t('hr.form.identity.nomMere.label')}
          </Label>
          <Input
            id="nomMere"
            value={nomMere}
            onChange={(e) => setNomMere(e.target.value)}
            placeholder={t('hr.form.identity.nomMere.placeholder')}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Sexe */}
        <div className="space-y-2">
          <Label htmlFor="sexe" className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {t('hr.form.identity.sexe.label')}
          </Label>
          <Select value={sexe} onValueChange={(val) => setSexe(val as PersonnelSexe | 'NONE')}>
            <SelectTrigger id="sexe" className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]">
              <SelectValue placeholder={t('hr.form.identity.sexe.placeholder')} />
            </SelectTrigger>
            <SelectContent dir={dir}>
              <SelectItem value="NONE" className="text-base py-2 font-medium">{t('hr.form.identity.sexe.none')}</SelectItem>
              <SelectItem value="Homme" className="text-base py-2">{t('hr.form.identity.sexe.male')}</SelectItem>
              <SelectItem value="Femme" className="text-base py-2">{t('hr.form.identity.sexe.female')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Groupe A : Groupe sanguin */}
        <div className="space-y-2">
          <Label htmlFor="groupeSanguin" className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {t('hr.form.identity.groupeSanguin.label')}
          </Label>
          <Select value={groupeSanguin} onValueChange={(val) => setGroupeSanguin(val)}>
            <SelectTrigger id="groupeSanguin" className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]">
              <SelectValue placeholder={t('hr.form.identity.groupeSanguin.placeholder')} />
            </SelectTrigger>
            <SelectContent dir={dir}>
              <SelectItem value="NONE" className="text-base py-2 font-medium">{t('hr.form.identity.groupeSanguin.none')}</SelectItem>
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
          <Label htmlFor="dateNaissance" className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {t('hr.form.identity.dateNaissance.label')}
          </Label>
          <Input
            id="dateNaissance"
            type="date"
            value={dateNaissance}
            onChange={(e) => setDateNaissance(e.target.value)}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Lieu de naissance */}
        <div className="space-y-2">
          <Label htmlFor="lieuNaissance" className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {t('hr.form.identity.lieuNaissance.label')}
          </Label>
          <Input
            id="lieuNaissance"
            value={lieuNaissance}
            onChange={(e) => setLieuNaissance(e.target.value)}
            placeholder={t('hr.form.identity.lieuNaissance.placeholder')}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* CIN */}
        <div className="space-y-2">
          <Label htmlFor="cin" className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <span>{t('hr.form.identity.cin.label')}</span>
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="cin"
            value={cin}
            maxLength={8}
            onChange={(e) => {
              setCin(e.target.value);
              if (errors.cin) setErrors((prev) => ({ ...prev, cin: undefined }));
            }}
            placeholder={t('hr.form.identity.cin.placeholder')}
            className={`h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] ${
              errors.cin ? 'border-red-500' : ''
            }`}
          />
          {errors.cin && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.cin}</span>
            </p>
          )}
        </div>

        {/* Groupe B : Date d'émission CIN */}
        <div className="space-y-2">
          <Label htmlFor="dateEmissionCin" className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {t('hr.form.identity.dateEmissionCin.label')}
          </Label>
          <Input
            id="dateEmissionCin"
            type="date"
            value={dateEmissionCin}
            onChange={(e) => setDateEmissionCin(e.target.value)}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Groupe D : Numéro de passeport */}
        <div className="space-y-2">
          <Label htmlFor="numeroPasseport" className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {t('hr.form.identity.numeroPasseport.label')}
          </Label>
          <Input
            id="numeroPasseport"
            value={numeroPasseport}
            onChange={(e) => setNumeroPasseport(e.target.value)}
            placeholder={t('hr.form.identity.numeroPasseport.placeholder')}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>

        {/* Groupe D : Date de validité du passeport */}
        <div className="space-y-2">
          <Label htmlFor="dateValiditePasseport" className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {t('hr.form.identity.dateValiditePasseport.label')}
          </Label>
          <Input
            id="dateValiditePasseport"
            type="date"
            value={dateValiditePasseport}
            onChange={(e) => setDateValiditePasseport(e.target.value)}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>
      </div>

      {/* Coordonnées */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-800">
        <div className="space-y-2">
          <Label htmlFor="telephone" className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <span>{t('hr.form.identity.telephone.label')}</span>
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="telephone"
            value={telephone}
            maxLength={8}
            onChange={(e) => {
              setTelephone(e.target.value);
              if (errors.telephone) setErrors((prev) => ({ ...prev, telephone: undefined }));
            }}
            placeholder={t('hr.form.identity.telephone.placeholder')}
            dir="ltr"
            className={`h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] ${
              isRTL ? 'text-right' : 'text-left'
            } ${errors.telephone ? 'border-red-500' : ''}`}
          />
          {errors.telephone && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.telephone}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="emailPersonnel" className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {t('hr.form.identity.emailPersonnel.label')}
          </Label>
          <Input
            id="emailPersonnel"
            type="email"
            value={emailPersonnel}
            onChange={(e) => {
              setEmailPersonnel(e.target.value);
              if (errors.emailPersonnel) setErrors((prev) => ({ ...prev, emailPersonnel: undefined }));
            }}
            placeholder={t('hr.form.identity.emailPersonnel.placeholder')}
            dir="ltr"
            className={`h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] ${
              isRTL ? 'text-right' : 'text-left'
            } ${errors.emailPersonnel ? 'border-red-500' : ''}`}
          />
          {errors.emailPersonnel && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.emailPersonnel}</span>
            </p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2 lg:col-span-1">
          <Label htmlFor="adresse" className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {t('hr.form.identity.adresse.label')}
          </Label>
          <Input
            id="adresse"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder={t('hr.form.identity.adresse.placeholder')}
            className="h-11 text-base bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
          />
        </div>
      </div>
    </div>
  );
};

export default Step1Identity;
