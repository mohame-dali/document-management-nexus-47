import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneCall } from 'lucide-react';
import { useDirection } from '@/i18n/useDirection';
import { ContactUrgenceItem } from '../PersonnelForm';

export interface Step4ContactsProps {
  personne1: ContactUrgenceItem;
  setPersonne1: React.Dispatch<React.SetStateAction<ContactUrgenceItem>>;
  personne2: ContactUrgenceItem;
  setPersonne2: React.Dispatch<React.SetStateAction<ContactUrgenceItem>>;
  personne3: ContactUrgenceItem;
  setPersonne3: React.Dispatch<React.SetStateAction<ContactUrgenceItem>>;
}

export const Step4Contacts: React.FC<Step4ContactsProps> = ({
  personne1,
  setPersonne1,
  personne2,
  setPersonne2,
  personne3,
  setPersonne3,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const phoneTextAlign = isRTL ? 'text-right' : 'text-left';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 pb-3 mb-6 flex items-center gap-2">
        <PhoneCall className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        <span>{t('hr.form.contacts.sectionTitle')}</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personne 1 */}
        <div className="border border-slate-200/90 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-700 pb-2">
            <span className="w-6 h-6 rounded-full bg-[#2c5282] text-white flex items-center justify-center text-xs font-bold tabular-nums">1</span>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{t('hr.form.contacts.person1')}</h3>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p1-nom" className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('hr.form.contacts.fullName.label')}</Label>
            <Input
              id="p1-nom"
              value={personne1.nom}
              onChange={(e) => setPersonne1({ ...personne1, nom: e.target.value })}
              placeholder={t('hr.form.contacts.fullName.placeholder')}
              className="h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p1-lien" className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('hr.form.contacts.relationship.label')}</Label>
            <Input
              id="p1-lien"
              value={personne1.lien}
              onChange={(e) => setPersonne1({ ...personne1, lien: e.target.value })}
              placeholder={t('hr.form.contacts.relationship.placeholder1')}
              className="h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p1-tel" className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('hr.form.contacts.phone.label')}</Label>
            <Input
              id="p1-tel"
              value={personne1.telephone}
              onChange={(e) => setPersonne1({ ...personne1, telephone: e.target.value })}
              placeholder={t('hr.form.contacts.phone.placeholder')}
              dir="ltr"
              className={`h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg ${phoneTextAlign}`}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p1-adr" className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('hr.form.contacts.address.label')}</Label>
            <Input
              id="p1-adr"
              value={personne1.adresse}
              onChange={(e) => setPersonne1({ ...personne1, adresse: e.target.value })}
              placeholder={t('hr.form.contacts.address.placeholder')}
              className="h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
            />
          </div>
        </div>

        {/* Personne 2 */}
        <div className="border border-slate-200/90 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-700 pb-2">
            <span className="w-6 h-6 rounded-full bg-[#2c5282] text-white flex items-center justify-center text-xs font-bold tabular-nums">2</span>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{t('hr.form.contacts.person2')}</h3>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p2-nom" className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('hr.form.contacts.fullName.label')}</Label>
            <Input
              id="p2-nom"
              value={personne2.nom}
              onChange={(e) => setPersonne2({ ...personne2, nom: e.target.value })}
              placeholder={t('hr.form.contacts.fullName.placeholder')}
              className="h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p2-lien" className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('hr.form.contacts.relationship.label')}</Label>
            <Input
              id="p2-lien"
              value={personne2.lien}
              onChange={(e) => setPersonne2({ ...personne2, lien: e.target.value })}
              placeholder={t('hr.form.contacts.relationship.placeholder2')}
              className="h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p2-tel" className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('hr.form.contacts.phone.label')}</Label>
            <Input
              id="p2-tel"
              value={personne2.telephone}
              onChange={(e) => setPersonne2({ ...personne2, telephone: e.target.value })}
              placeholder={t('hr.form.contacts.phone.placeholder')}
              dir="ltr"
              className={`h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg ${phoneTextAlign}`}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p2-adr" className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('hr.form.contacts.address.label')}</Label>
            <Input
              id="p2-adr"
              value={personne2.adresse}
              onChange={(e) => setPersonne2({ ...personne2, adresse: e.target.value })}
              placeholder={t('hr.form.contacts.address.placeholder')}
              className="h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
            />
          </div>
        </div>

        {/* Personne 3 */}
        <div className="border border-slate-200/90 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-700 pb-2">
            <span className="w-6 h-6 rounded-full bg-[#2c5282] text-white flex items-center justify-center text-xs font-bold tabular-nums">3</span>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{t('hr.form.contacts.person3')}</h3>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p3-nom" className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('hr.form.contacts.fullName.label')}</Label>
            <Input
              id="p3-nom"
              value={personne3.nom}
              onChange={(e) => setPersonne3({ ...personne3, nom: e.target.value })}
              placeholder={t('hr.form.contacts.fullName.placeholder')}
              className="h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p3-lien" className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('hr.form.contacts.relationship.label')}</Label>
            <Input
              id="p3-lien"
              value={personne3.lien}
              onChange={(e) => setPersonne3({ ...personne3, lien: e.target.value })}
              placeholder={t('hr.form.contacts.relationship.placeholder3')}
              className="h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p3-tel" className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('hr.form.contacts.phone.label')}</Label>
            <Input
              id="p3-tel"
              value={personne3.telephone}
              onChange={(e) => setPersonne3({ ...personne3, telephone: e.target.value })}
              placeholder={t('hr.form.contacts.phone.placeholder')}
              dir="ltr"
              className={`h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg ${phoneTextAlign}`}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p3-adr" className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('hr.form.contacts.address.label')}</Label>
            <Input
              id="p3-adr"
              value={personne3.adresse}
              onChange={(e) => setPersonne3({ ...personne3, adresse: e.target.value })}
              placeholder={t('hr.form.contacts.address.placeholder')}
              className="h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step4Contacts;
