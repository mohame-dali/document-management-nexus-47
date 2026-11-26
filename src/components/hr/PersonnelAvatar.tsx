import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { getPhotoUrl } from '@/services/hr/personnelApi';

export interface PersonnelAvatarProps {
  photo?: string | null;
  nom?: string;
  prenom?: string;
  username?: string; // fallback si pas de nom/prenom
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeConfig = {
  xs: {
    container: 'w-6 h-6 border',
    text: 'text-[10px]',
    icon: 'w-3.5 h-3.5',
  },
  sm: {
    container: 'w-8 h-8 border',
    text: 'text-xs',
    icon: 'w-4 h-4',
  },
  md: {
    container: 'w-9 h-9 border',
    text: 'text-sm',
    icon: 'w-5 h-5',
  },
  lg: {
    container: 'w-24 h-24 border-2 shadow-sm',
    text: 'text-3xl tracking-wider',
    icon: 'w-10 h-10',
  },
};

const PASTEL_PALETTES = [
  'bg-gradient-to-br from-sky-100 to-blue-200 text-sky-900 border-sky-200/90 dark:from-sky-900/60 dark:to-blue-900/50 dark:text-sky-100 dark:border-sky-700/60',
  'bg-gradient-to-br from-emerald-100 to-teal-200 text-emerald-900 border-emerald-200/90 dark:from-emerald-900/60 dark:to-teal-900/50 dark:text-emerald-100 dark:border-emerald-700/60',
  'bg-gradient-to-br from-amber-100 to-orange-200 text-amber-900 border-amber-200/90 dark:from-amber-900/60 dark:to-orange-900/50 dark:text-amber-100 dark:border-amber-700/60',
  'bg-gradient-to-br from-violet-100 to-indigo-200 text-violet-900 border-violet-200/90 dark:from-violet-900/60 dark:to-indigo-900/50 dark:text-violet-100 dark:border-violet-700/60',
  'bg-gradient-to-br from-rose-100 to-pink-200 text-rose-900 border-rose-200/90 dark:from-rose-900/60 dark:to-pink-900/50 dark:text-rose-100 dark:border-rose-700/60',
  'bg-gradient-to-br from-cyan-100 to-slate-200 text-cyan-900 border-cyan-200/90 dark:from-cyan-900/60 dark:to-slate-800 dark:text-cyan-100 dark:border-cyan-700/60',
];

const getAvatarPalette = (seed: string): string => {
  if (!seed) return PASTEL_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PASTEL_PALETTES[hash % PASTEL_PALETTES.length];
};

export const PersonnelAvatar: React.FC<PersonnelAvatarProps> = ({
  photo,
  nom,
  prenom,
  username,
  size = 'md',
  className = '',
}) => {
  const [photoError, setPhotoError] = useState(false);

  // Réinitialiser l'état d'erreur si l'URL de la photo change
  useEffect(() => {
    setPhotoError(false);
  }, [photo]);

  const initials = [
    prenom?.trim().charAt(0) || '',
    nom?.trim().charAt(0) || '',
  ]
    .filter(Boolean)
    .join('') || (username?.trim().charAt(0)?.toUpperCase() || '');

  const altText = [prenom, nom].filter(Boolean).join(' ') || username || 'Personnel';
  const config = sizeConfig[size] || sizeConfig.md;
  const paletteClass = getAvatarPalette(altText);

  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center shrink-0 ${
        photo && !photoError
          ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'
          : paletteClass
      } ${config.container} ${className}`}
    >
      {photo && !photoError ? (
        <img
          src={getPhotoUrl(photo)}
          alt={altText}
          className="w-full h-full object-cover"
          onError={() => setPhotoError(true)}
        />
      ) : initials ? (
        <span className={`${config.text} font-bold select-none leading-none`}>
          {initials}
        </span>
      ) : (
        <User className={`${config.icon} opacity-80`} />
      )}
    </div>
  );
};

export default PersonnelAvatar;
