import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PersonnelAvatar from '@/components/hr/PersonnelAvatar';
import { Search, Mail, Users, Shield, Building2, Settings, User as UserIcon } from 'lucide-react';
import { getMessagingUsers } from '@/services/userService';
import { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';

interface ContactsListProps {
  onSelectUser: (user: User) => void;
  onComposeMessage: (recipients: User[]) => void;
}

const ContactsList: React.FC<ContactsListProps> = ({ onSelectUser, onComposeMessage }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { dir, isRTL } = useDirection();

  const { data: users, isLoading } = useQuery({
    queryKey: ['messaging-users'],
    queryFn: getMessagingUsers
  });

  const filteredUsers = users?.filter(user => {
    if (user._id === currentUser?._id) return false;
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;

    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    const matchesUsername = user.username.toLowerCase().includes(term);
    const matchesRole = user.role.toLowerCase().includes(term);
    const matchesDept = user.activeDepartment && typeof user.activeDepartment === 'object' &&
      user.activeDepartment.name.toLowerCase().includes(term);

    return matchesUsername || matchesRole || matchesDept;
  }) || [];

  const toggleUserSelection = (user: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u._id === user._id);
      if (isSelected) {
        return prev.filter(u => u._id !== user._id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleComposeToSelected = () => {
    if (selectedUsers.length > 0) {
      onComposeMessage(selectedUsers);
      setSelectedUsers([]);
    }
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

  const roleCounts = users?.reduce((acc, user) => {
    if (user._id !== currentUser?._id) {
      acc[user.role] = (acc[user.role] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <Card className="border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 rounded-xl overflow-hidden" dir={dir}>
      <CardHeader className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-[#2c5282] dark:text-sky-400 rounded-lg shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {t('messages.allContacts')} ({filteredUsers.length})
              </CardTitle>
              <p className="text-[13px] text-slate-700 dark:text-slate-300 truncate">
                {isRTL
                  ? 'دليل المستخدمين ومسؤولي الأقسام المتاحين للمراسلة'
                  : 'Annuaire des utilisateurs et chefs de service disponibles'}
              </p>
            </div>
          </div>

          {selectedUsers.length > 0 && (
            <Button
              size="sm"
              onClick={handleComposeToSelected}
              className="h-9 px-3 rounded-lg bg-[#FFCB56] hover:bg-[#FFD758] text-[#1a202c] border border-[#FFD758] font-semibold text-xs transition-colors duration-200 flex items-center gap-1.5 tabular-nums"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>{isRTL ? `مراسلة (${selectedUsers.length})` : `Écrire (${selectedUsers.length})`}</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute start-3.5 top-2.5 h-4 w-4 text-slate-700 dark:text-slate-300 pointer-events-none" />
          <Input
            placeholder={t('messages.searchContact')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ps-10 pe-3 text-xs text-start bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#2c5282] dark:focus:border-sky-500 rounded-lg h-9"
          />
        </div>

        {/* Role Filters */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button
            variant={roleFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRoleFilter('all')}
            className={`h-9 px-3 text-xs rounded-lg transition-colors duration-200 tabular-nums ${
              roleFilter === 'all'
                ? 'bg-[#2c5282] hover:bg-[#234269] dark:bg-sky-700 dark:hover:bg-sky-600 text-white border-transparent'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {isRTL ? 'الكل' : 'Tous'} ({Object.values(roleCounts).reduce((a, b) => a + b, 0)})
          </Button>

          {Object.entries(roleCounts).map(([role, count]) => (
            <Button
              key={role}
              variant={roleFilter === role ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter(role)}
              className={`h-9 px-3 text-xs rounded-lg transition-colors duration-200 flex items-center gap-1.5 tabular-nums ${
                roleFilter === role
                  ? 'bg-[#2c5282] hover:bg-[#234269] dark:bg-sky-700 dark:hover:bg-sky-600 text-white border-transparent'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {getRoleIcon(role)}
              <span>{getRoleDisplayName(role)}</span>
              <span className="text-[13px] opacity-80">({count})</span>
            </Button>
          ))}
        </div>

        {/* Selected pill row */}
        {selectedUsers.length > 0 && (
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-medium block mb-1.5 tabular-nums">
              {isRTL ? `المستخدمون المحددون (${selectedUsers.length}):` : `Utilisateurs sélectionnés (${selectedUsers.length}) :`}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedUsers.map(user => (
                <span
                  key={user._id}
                  className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                >
                  <span className="font-medium">{user.username}</span>
                  <button
                    type="button"
                    onClick={() => toggleUserSelection(user)}
                    aria-label={t('messages.deselectUserAria', { username: user.username })}
                    className="w-6 h-6 inline-flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 rounded"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contact list items */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[28rem] overflow-y-auto border border-slate-200/80 dark:border-slate-800 rounded-lg">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center text-slate-700 dark:text-slate-300 py-8 text-xs">
              <p>{t('messages.noContactsFound')}</p>
            </div>
          ) : (
            filteredUsers.map(user => {
              const isSelected = selectedUsers.some(u => u._id === user._id);

              return (
                <div
                  key={user._id}
                  onClick={() => toggleUserSelection(user)}
                  className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors duration-150 ${
                    isSelected
                      ? 'bg-[#ebf4ff]/70 dark:bg-sky-950/40'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-slate-300 dark:border-slate-600 text-[#2c5282] dark:text-sky-500 focus:ring-0"
                    />

                    <PersonnelAvatar
                      photo={user.photo}
                      nom={user.nom}
                      prenom={user.prenom}
                      username={user.username}
                      size="sm"
                      className="h-8 w-8 ring-1 ring-slate-200 dark:ring-slate-700"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {user.username}
                        </span>
                        <Badge variant="outline" className={`text-[13px] px-1.5 py-0 rounded-md ${getRoleColor(user.role)}`}>
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </div>
                      {user.activeDepartment && typeof user.activeDepartment === 'object' && (
                        <span className="text-[13px] text-slate-700 dark:text-slate-300 block truncate">
                          {isRTL ? 'قسم:' : 'Service :'} {user.activeDepartment.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectUser(user);
                    }}
                    className="h-9 px-3 text-xs text-[#2c5282] dark:text-sky-400 hover:bg-blue-50 dark:hover:bg-sky-950/50 rounded-lg flex items-center gap-1.5 shrink-0"
                    title={isRTL ? 'مراسلة فورية' : 'Message direct'}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>{isRTL ? 'مراسلة' : 'Écrire'}</span>
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactsList;
