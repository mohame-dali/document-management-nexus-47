import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Mail, Users, Shield, Building2, Settings, User as UserIcon, Check } from 'lucide-react';
import { getMessagingUsers } from '@/services/userService';
import { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';

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
      case 'Admin': return 'bg-red-50 text-red-700 border-red-200';
      case 'AdminDepartment': return 'bg-blue-50 text-[#2c5282] border-blue-200';
      case 'AdminTuningDesk': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRoleDisplayName = (role: string) => {
    return t(`roles.${role}`) || role;
  };

  const getUserPhoto = (user: User): string => {
    if (user.photo) {
      const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
      return `${API_URL}${user.photo}`;
    }
    return '';
  };

  const roleCounts = users?.reduce((acc, user) => {
    if (user._id !== currentUser?._id) {
      acc[user.role] = (acc[user.role] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <Card className="border border-[#e2e8f0] shadow-xs bg-white rounded" dir="rtl">
      <CardHeader className="p-4 border-b border-[#e2e8f0] bg-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-100 text-[#2c5282] rounded">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                {t('messages.allContacts')} ({filteredUsers.length})
              </CardTitle>
              <p className="text-[11px] text-slate-500">دليل المستخدمين ومسؤولي الأقسام المتاحين للمراسلة</p>
            </div>
          </div>

          {selectedUsers.length > 0 && (
            <Button 
              size="sm" 
              onClick={handleComposeToSelected}
              className="h-8 px-3 rounded bg-[#FFCB56] hover:bg-[#FFD758] text-[#1a202c] border border-[#FFCB56] font-semibold text-xs transition-colors duration-200 flex items-center gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>مراسلة ({selectedUsers.length})</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder={t('messages.searchContact')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-8 text-xs text-right border-[#cbd5e1] focus:border-[#2c5282] rounded h-9"
          />
        </div>

        {/* Role Filters */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button
            variant={roleFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRoleFilter('all')}
            className={`h-7 px-2.5 text-xs rounded transition-colors duration-200 ${
              roleFilter === 'all' 
                ? 'bg-[#2c5282] hover:bg-[#234269] text-white border-transparent' 
                : 'border-[#cbd5e1] text-slate-600 hover:bg-slate-50'
            }`}
          >
            الكل ({Object.values(roleCounts).reduce((a, b) => a + b, 0)})
          </Button>

          {Object.entries(roleCounts).map(([role, count]) => (
            <Button
              key={role}
              variant={roleFilter === role ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter(role)}
              className={`h-7 px-2.5 text-xs rounded transition-colors duration-200 flex items-center gap-1 ${
                roleFilter === role
                  ? 'bg-[#2c5282] hover:bg-[#234269] text-white border-transparent'
                  : 'border-[#cbd5e1] text-slate-600 hover:bg-slate-50'
              }`}
            >
              {getRoleIcon(role)}
              <span>{getRoleDisplayName(role)}</span>
              <span className="text-[10px] opacity-80">({count})</span>
            </Button>
          ))}
        </div>

        {/* Selected pill row */}
        {selectedUsers.length > 0 && (
          <div className="p-2.5 bg-[#f8fafc] rounded border border-[#e2e8f0] text-xs">
            <span className="text-slate-500 font-medium block mb-1.5">
              المستخدمون المحددون ({selectedUsers.length}):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedUsers.map(user => (
                <span 
                  key={user._id} 
                  className="inline-flex items-center gap-1.5 bg-white px-2 py-0.5 rounded border border-[#cbd5e1] text-slate-700"
                >
                  <span className="font-medium">{user.username}</span>
                  <button 
                    type="button" 
                    onClick={() => toggleUserSelection(user)}
                    className="text-slate-400 hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contact list items */}
        <div className="divide-y divide-[#edf2f7] max-h-96 overflow-y-auto border border-[#e2e8f0] rounded">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center text-slate-500 py-6 text-xs">
              <p>{t('messages.noContactsFound')}</p>
            </div>
          ) : (
            filteredUsers.map(user => {
              const isSelected = selectedUsers.some(u => u._id === user._id);
              const photo = getUserPhoto(user);

              return (
                <div
                  key={user._id}
                  onClick={() => toggleUserSelection(user)}
                  className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors duration-200 ${
                    isSelected ? 'bg-blue-50/70' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-[#2c5282] focus:ring-0"
                    />

                    <Avatar className="h-8 w-8 rounded border border-[#e2e8f0]">
                      {photo ? (
                        <AvatarImage src={photo} alt={user.username} className="object-cover" />
                      ) : null}
                      <AvatarFallback className="rounded bg-slate-100 text-[#2c5282] text-xs font-semibold">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-800 truncate">{user.username}</span>
                        <Badge variant="outline" className={`text-[10px] px-1 py-0 rounded ${getRoleColor(user.role)}`}>
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </div>
                      {user.activeDepartment && typeof user.activeDepartment === 'object' && (
                        <span className="text-[11px] text-slate-500 block truncate">
                          قسم: {user.activeDepartment.name}
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
                    className="h-7 px-2 text-xs text-[#2c5282] hover:bg-blue-50 rounded flex items-center gap-1"
                    title="مراسلة فورية"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>مراسلة</span>
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
