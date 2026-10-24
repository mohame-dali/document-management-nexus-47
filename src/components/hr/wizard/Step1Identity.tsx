import React from 'react';
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
import { PersonnelExtendedData } from '../PersonnelForm';

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
  errors: { nom?: string; prenom?: string };
  setErrors: React.Dispatch<React.SetStateAction<{ nom?: string; prenom?: string }>>;
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
  return (
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
  );
};

export default Step1Identity;
