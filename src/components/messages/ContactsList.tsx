
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Mail, Users, Shield, Building2, Settings, User as UserIcon } from 'lucide-react';
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

  // Enhanced filtering for cross-role messaging
  const filteredUsers = users?.filter(user => {
    // Exclude current user
    if (user._id === currentUser?._id) return false;
    
    // Role filter
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;
    
    // Search filter
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.activeDepartment && typeof user.activeDepartment === 'object' && 
       user.activeDepartment.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
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
      case 'Admin':
        return <Shield className="h-3 w-3" />;
      case 'AdminDepartment':
        return <Building2 className="h-3 w-3" />;
      case 'AdminTuningDesk':
        return <Settings className="h-3 w-3" />;
      case 'User':
        return <UserIcon className="h-3 w-3" />;
      default:
        return <UserIcon className="h-3 w-3" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'AdminDepartment':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'AdminTuningDesk':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'User':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleDisplayName = (role: string) => {
    return t(`roles.${role}`) || role;
  };

  const getUserPhoto = (user: User): string => {
    if (user.photo) {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      return `${API_URL}${user.photo}`;
    }
    return '';
  };

  // Count users by role
  const roleCounts = users?.reduce((acc, user) => {
    if (user._id !== currentUser?._id) {
      acc[user.role] = (acc[user.role] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <Card className="h-full border-0 shadow-2xl bg-white/90 backdrop-blur-sm" dir="rtl">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl shadow-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t('messages.allContacts')} ({filteredUsers.length})
            </span>
          </CardTitle>
          {selectedUsers.length > 0 && (
            <Button 
              size="sm" 
              onClick={handleComposeToSelected}
              className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg"
            >
              <Mail className="h-4 w-4 ml-2" />
              رسالة ({selectedUsers.length})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('messages.searchContact')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 text-right border-2 border-gray-200 focus:border-blue-400 bg-white shadow-sm h-12"
          />
        </div>

        {/* Role Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={roleFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRoleFilter('all')}
            className={roleFilter === 'all' 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' 
              : 'hover:bg-blue-50 border-2'
            }
          >
            الكل ({Object.values(roleCounts).reduce((a, b) => a + b, 0)})
          </Button>
          {Object.entries(roleCounts).map(([role, count]) => (
            <Button
              key={role}
              variant={roleFilter === role ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter(role)}
              className={`flex items-center gap-1 ${
                roleFilter === role
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                  : 'hover:bg-green-50 border-2'
              }`}
            >
              {getRoleIcon(role)}
              {getRoleDisplayName(role)} ({count})
            </Button>
          ))}
        </div>

        {/* Selected Users Summary */}
        {selectedUsers.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
            <div className="text-sm font-medium text-blue-800 mb-3">
              {t('messages.selected')} ({selectedUsers.length}):
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map(user => (
                <div key={user._id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-blue-200">
                  <Avatar className="h-6 w-6">
                    {getUserPhoto(user) ? (
                      <AvatarImage 
                        src={getUserPhoto(user)} 
                        alt={user.username}
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className={`text-xs font-medium ${getRoleColor(user.role)}`}>
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Badge variant="secondary" className="text-xs">
                    {user.username} ({getRoleDisplayName(user.role)})
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cross-role messaging info */}
        <div className="text-xs text-gray-600 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 shadow-sm">
          <div className="font-medium mb-2 text-blue-800">{t('messages.crossRoleInfo')}</div>
          <div className="space-y-1 text-blue-700">
            <div>• {t('messages.canMessageAny')}</div>
            <div>• {t('messages.allUsersCanCommunicate')}</div>
            <div>• {t('messages.noDepartmentRestriction')}</div>
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center space-x-3 p-4 rounded-xl bg-gray-50">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 opacity-50" />
              </div>
              <p className="font-medium mb-1">{t('messages.noContactsFound')}</p>
              {searchTerm && <p className="text-xs">{t('messages.adjustSearch')}</p>}
            </div>
          ) : (
            filteredUsers.map(user => (
              <div
                key={user._id}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                  selectedUsers.some(u => u._id === user._id)
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-md transform scale-105'
                    : 'hover:bg-gray-50 border-gray-200 hover:shadow-lg hover:border-gray-300'
                }`}
                onClick={() => toggleUserSelection(user)}
              >
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-lg">
                      {getUserPhoto(user) ? (
                        <AvatarImage 
                          src={getUserPhoto(user)} 
                          alt={user.username}
                          className="object-cover"
                        />
                      ) : null}
                      <AvatarFallback className={`text-sm font-bold ${getRoleColor(user.role)}`}>
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {!user.isActive && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm truncate text-gray-800">
                        {user.username}
                      </span>
                      {!user.isActive && (
                        <Badge variant="outline" className="text-xs border-red-200 text-red-600 bg-red-50">
                          {t('messages.inactive')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`text-xs border shadow-sm ${getRoleColor(user.role)} flex items-center gap-1`}>
                        {getRoleIcon(user.role)}
                        {getRoleDisplayName(user.role)}
                      </Badge>
                      {user.activeDepartment && typeof user.activeDepartment === 'object' && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {user.activeDepartment.name}
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
                    className="hover:bg-blue-100 hover:text-blue-600"
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactsList;
