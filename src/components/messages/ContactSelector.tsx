import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PersonnelAvatar from '@/components/hr/PersonnelAvatar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  X,
  Users,
  Shield,
  Building2,
  Settings,
  User as UserIcon,
  ChevronDown,
  Check
} from 'lucide-react';
import { getMessagingUsers } from '@/services/userService';
import { User } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';

interface ContactSelectorProps {
  selectedContacts: User[];
  onContactsChange: (contacts: User[]) => void;
}

const ContactSelector: React.FC<ContactSelectorProps> = ({
  selectedContacts,
  onContactsChange
}) => {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const { dir, isRTL } = useDirection();

  const { data: users } = useQuery({
    queryKey: ['messaging-users'],
    queryFn: getMessagingUsers
  });

  const availableUsers = users?.filter(user =>
    !selectedContacts.some(selected => selected._id === user._id)
  ) || [];

  const addContact = (user: User) => {
    onContactsChange([...selectedContacts, user]);
    setOpen(false);
  };

  const removeContact = (userId: string) => {
    onContactsChange(selectedContacts.filter(contact => contact._id !== userId));
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin': return <Shield className="h-3 w-3" />;
      case 'AdminDepartment': return <Building2 className="h-3 w-3" />;
      case 'AdminTuningDesk': return <Settings className="h-3 w-3" />;
      default: return <UserIcon className="h-3 w-3" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60';
      case 'AdminDepartment': return 'bg-blue-50 dark:bg-sky-950/40 text-[#2c5282] dark:text-sky-300 border-blue-200 dark:border-sky-800/60';
      case 'AdminTuningDesk': return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getRoleDisplayName = (role: string) => {
    return t(`roles.${role}`) || role;
  };

  return (
    <div className="space-y-2" dir={dir}>
      {/* Selected Contacts Pills */}
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200/80 dark:border-slate-800">
          {selectedContacts.map(contact => (
            <span
              key={contact._id}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-100"
            >
              <span className="font-semibold">{contact.username}</span>
              <Badge variant="outline" className={`text-[10px] px-1 py-0 rounded ${getRoleColor(contact.role)}`}>
                {getRoleDisplayName(contact.role)}
              </Badge>
              <button
                type="button"
                aria-label={t('messages.removeRecipientAria', { username: contact.username })}
                title={t('messages.removeRecipientAria', { username: contact.username })}
                className="w-6 h-6 inline-flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded"
                onClick={() => removeContact(contact._id)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Popover trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-10 w-full justify-between bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 hover:border-[#2c5282] dark:hover:border-sky-500 rounded-lg px-3.5 text-start transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                {selectedContacts.length > 0
                  ? (isRTL ? `${selectedContacts.length} مستلم محدد` : `${selectedContacts.length} destinataire(s) sélectionné(s)`)
                  : (t('messages.selectContacts') || (isRTL ? 'اختر المستلمين...' : 'Sélectionner des destinataires...'))}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="p-0 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md max-h-[300px] overflow-y-auto"
          align="start"
          side="bottom"
          sideOffset={6}
          style={{ width: 'var(--radix-popover-trigger-width)' }}
          dir={dir}
        >
          <Command className="bg-white dark:bg-slate-900">
            <CommandInput
              placeholder={t('messages.searchContacts')}
              className="text-xs text-start h-9"
            />
            <CommandList className="max-h-60">
              <CommandEmpty className="p-3 text-xs text-slate-500 dark:text-slate-400 text-center">
                {t('messages.noContactsFound')}
              </CommandEmpty>
              <CommandGroup>
                {availableUsers.map((user) => (
                  <CommandItem
                    key={user._id}
                    value={user.username}
                    onSelect={() => addContact(user)}
                    className="flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/70 p-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <PersonnelAvatar
                        photo={user.photo}
                        nom={user.nom}
                        prenom={user.prenom}
                        username={user.username}
                        size="xs"
                      />
                      <span className="text-slate-400 dark:text-slate-500">{getRoleIcon(user.role)}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">{user.username}</span>
                      <Badge variant="outline" className={`text-[10px] px-1 py-0 rounded ${getRoleColor(user.role)}`}>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                      {user.activeDepartment && typeof user.activeDepartment === 'object' && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          ({user.activeDepartment.name})
                        </span>
                      )}
                    </div>
                    <Check className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400 opacity-0 group-hover:opacity-100" />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ContactSelector;
