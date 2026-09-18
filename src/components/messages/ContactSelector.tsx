import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      case 'Admin': return 'bg-red-50 text-red-700 border-red-200';
      case 'AdminDepartment': return 'bg-blue-50 text-[#2c5282] border-blue-200';
      case 'AdminTuningDesk': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRoleDisplayName = (role: string) => {
    return t(`roles.${role}`) || role;
  };

  return (
    <div className="space-y-2" dir="rtl">
      {/* Selected Contacts Pills */}
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-[#f8fafc] rounded border border-[#e2e8f0]">
          {selectedContacts.map(contact => (
            <span 
              key={contact._id} 
              className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-[#cbd5e1] rounded text-xs text-slate-800"
            >
              <span className="font-semibold">{contact.username}</span>
              <Badge variant="outline" className={`text-[10px] px-1 py-0 rounded ${getRoleColor(contact.role)}`}>
                {getRoleDisplayName(contact.role)}
              </Badge>
              <button
                type="button"
                className="h-4 w-4 inline-flex items-center justify-center text-slate-400 hover:text-red-600 rounded"
                onClick={() => removeContact(contact._id)}
              >
                <X className="h-3 w-3" />
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
            className="h-11 w-full justify-between bg-white border-[#cbd5e1] hover:border-[#2c5282] rounded-lg px-4 text-right transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {selectedContacts.length > 0 
                  ? `${selectedContacts.length} مستلم محدد` 
                  : (t('messages.selectContacts') || 'اختر المستلمين...')}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          </Button>
        </PopoverTrigger>

        <PopoverContent 
          className="p-0 rounded-lg border border-[#e2e8f0] shadow-lg max-h-[300px] overflow-y-auto"
          align="start"
          side="bottom"
          sideOffset={6}
          style={{ width: 'var(--radix-popover-trigger-width)' }}
          dir="rtl"
        >
          <Command>
            <CommandInput 
              placeholder={t('messages.searchContacts')} 
              className="text-xs text-right h-9"
            />
            <CommandList className="max-h-60">
              <CommandEmpty className="p-3 text-xs text-slate-500 text-center">
                {t('messages.noContactsFound')}
              </CommandEmpty>
              <CommandGroup>
                {availableUsers.map((user) => (
                  <CommandItem
                    key={user._id}
                    value={user.username}
                    onSelect={() => addContact(user)}
                    className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getRoleIcon(user.role)}
                      <span className="font-semibold text-slate-800 truncate">{user.username}</span>
                      <Badge variant="outline" className={`text-[10px] px-1 py-0 rounded ${getRoleColor(user.role)}`}>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                      {user.activeDepartment && typeof user.activeDepartment === 'object' && (
                        <span className="text-[10px] text-slate-500 truncate">
                          ({user.activeDepartment.name})
                        </span>
                      )}
                    </div>
                    <Check className="h-3.5 w-3.5 text-[#2c5282] opacity-0 group-hover:opacity-100" />
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
