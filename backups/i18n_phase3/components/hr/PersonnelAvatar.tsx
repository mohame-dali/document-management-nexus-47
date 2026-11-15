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

  return (
    <div
      className={`rounded-full border-[#cbd5e1] overflow-hidden bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0 ${config.container} ${className}`}
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
        <User className={`${config.icon} text-[#2c5282]`} />
      )}
    </div>
  );
};

export default PersonnelAvatar;
