
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';

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
      case 'AdminDepartment': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'AdminTuningDesk': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRoleDisplayName = (role: string) => {
    return t(`roles.${role}`) || role;
  };

  return (
    <div className="space-y-3">
      {/* Selected Contacts */}
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border">
          {selectedContacts.map(contact => (
            <Badge 
              key={contact._id} 
              variant="secondary" 
              className="flex items-center gap-2 px-3 py-1 bg-white border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-1">
                {getRoleIcon(contact.role)}
                <span className="font-medium text-sm">{contact.username}</span>
              </div>
              <Badge className={`text-xs px-2 py-0.5 ${getRoleColor(contact.role)}`}>
                {getRoleDisplayName(contact.role)}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-red-100 rounded-full"
                onClick={() => removeContact(contact._id)}
              >
                <X className="h-3 w-3 text-red-500" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Contact Selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-12 text-right border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                {selectedContacts.length > 0 
                  ? `${selectedContacts.length} ${t('messages.contactsSelected')}`
                  : t('messages.selectContacts')
                }
              </span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput 
              placeholder={t('messages.searchContacts')} 
              className="text-right"
            />
            <CommandList>
              <CommandEmpty>{t('messages.noContactsFound')}</CommandEmpty>
              <CommandGroup>
                {availableUsers.map((user) => (
                  <CommandItem
                    key={user._id}
                    value={user.username}
                    onSelect={() => addContact(user)}
                    className="flex items-center justify-between cursor-pointer hover:bg-blue-50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <span className="font-medium">{user.username}</span>
                      </div>
                      <Badge className={`text-xs px-2 py-0.5 ${getRoleColor(user.role)}`}>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                      {user.activeDepartment && typeof user.activeDepartment === 'object' && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {user.activeDepartment.name}
                        </span>
                      )}
                    </div>
                    <Check className="h-4 w-4 text-blue-600" />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Info Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-sm">
            <div className="font-medium text-blue-800 mb-1">
              {t('messages.enhancedMessaging')}
            </div>
            <div className="text-blue-700 space-y-1">
              <div>• {t('messages.canSendToAny')}</div>
              <div>• {t('messages.crossRoleMessaging')}</div>
              <div>• {t('messages.noDepartmentRestriction')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSelector;
