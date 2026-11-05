import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Search, 
  Inbox, 
  Send, 
  UserCheck, 
  Users, 
  Loader2, 
  X, 
  FileText,
  CornerDownLeft
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageProvider';

interface IncomingSearchResult {
  _id: string;
  serialNumber: number;
  year: number;
  subject: string;
  correspondenceNumber?: string;
  arrivalDate?: string;
  typeDocument?: string;
}

interface OutgoingSearchResult {
  _id: string;
  serialNumber: number;
  year: number;
  subject: string;
  issueDate?: string;
  typeDocument?: string;
}

interface PersonnelSearchResult {
  _id: string;
  nom: string;
  prenom: string;
  cin?: string;
  poste?: string;
  activeDepartment?: {
    _id?: string;
    name?: string;
  };
  statut?: string;
}

interface UserSearchResult {
  _id: string;
  username: string;
  role: string;
  activeDepartment?: {
    _id?: string;
    name?: string;
  };
}

interface SearchResultsData {
  incoming: IncomingSearchResult[];
  outgoing: OutgoingSearchResult[];
  personnel: PersonnelSearchResult[];
  users: UserSearchResult[];
}

const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isRtl = language === 'ar';

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchTerm.trim());
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Query search endpoint
  const { data, isLoading, isFetching } = useQuery<SearchResultsData>({
    queryKey: ['globalSearch', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) {
        return { incoming: [], outgoing: [], personnel: [], users: [] };
      }
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/search', {
        params: { q: debouncedQuery },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = res.data?.data || res.data || {};
      return {
        incoming: Array.isArray(payload.incoming) ? payload.incoming : [],
        outgoing: Array.isArray(payload.outgoing) ? payload.outgoing : [],
        personnel: Array.isArray(payload.personnel) ? payload.personnel : [],
        users: Array.isArray(payload.users) ? payload.users : [],
      };
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 1000 * 30, // 30 secondes
  });

  // Open dropdown when user types >= 2 characters
  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [searchTerm]);

  const handleSelect = (url: string) => {
    setIsOpen(false);
    setSearchTerm('');
    navigate(url);
  };

  const handleClear = () => {
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const results = data || { incoming: [], outgoing: [], personnel: [], users: [] };
  const totalResults =
    results.incoming.length +
    results.outgoing.length +
    results.personnel.length +
    results.users.length;

  const showLoading = isLoading || isFetching;

  return (
    <div className="relative w-full" dir={isRtl ? 'rtl' : 'ltr'}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <div className="relative flex items-center w-full">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none select-none z-10" />
            <Input
              id="global-search-input"
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => {
                if (searchTerm.trim().length >= 2) setIsOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                  inputRef.current?.blur();
                }
              }}
              placeholder={isRtl ? "بحث شامل في النظام... (Ctrl+K)" : "Recherche globale... (Ctrl+K)"}
              className="h-9 ps-9 pe-16 text-xs bg-slate-50/70 border-slate-200 hover:bg-slate-50 focus:bg-white focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] transition-colors rounded-md w-full"
              autoComplete="off"
              aria-label="Recherche globale"
            />
            <div className="absolute end-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                  aria-label="Effacer la recherche"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {!searchTerm && (
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-white border border-slate-200 rounded shadow-xs pointer-events-none select-none">
                  <span className="text-[9px]">Ctrl</span>K
                </kbd>
              )}
            </div>
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={isRtl ? 'end' : 'start'}
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="w-[calc(100vw-32px)] sm:w-[460px] md:w-[520px] max-h-[460px] overflow-y-auto p-2 bg-white border border-slate-200 shadow-xl rounded-lg z-50 text-start"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {showLoading && (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-[#2c5282]" />
              <span>{isRtl ? 'جاري البحث...' : 'Recherche en cours...'}</span>
            </div>
          )}

          {!showLoading && debouncedQuery.length >= 2 && totalResults === 0 && (
            <div className="py-8 text-center space-y-1">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">
                {isRtl ? 'لا توجد نتائج مطابقة' : 'Aucun résultat trouvé'}
              </p>
              <p className="text-[11px] text-slate-400">
                {isRtl
                  ? `لم نتمكن من العثور على أي نتيجة تطابق "${debouncedQuery}"`
                  : `Aucune correspondance trouvée pour "${debouncedQuery}"`}
              </p>
            </div>
          )}

          {!showLoading && totalResults > 0 && (
            <div className="space-y-2">
              {/* Catégorie 1 : Courriers entrants */}
              {results.incoming.length > 0 && (
                <div>
                  <DropdownMenuLabel className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-blue-900 bg-blue-50/70 rounded">
                    <span className="flex items-center gap-1.5">
                      <Inbox className="w-3.5 h-3.5 text-blue-600" />
                      {isRtl ? 'البريد والوثائق الواردة' : 'Courriers entrants'}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white border-blue-200 text-blue-700">
                      {results.incoming.length}
                    </Badge>
                  </DropdownMenuLabel>
                  <div className="mt-1 space-y-0.5">
                    {results.incoming.map((doc) => (
                      <DropdownMenuItem
                        key={`inc-${doc._id}`}
                        onClick={() => handleSelect(`/dashboard/mail/incoming/${doc._id}`)}
                        className="flex items-start justify-between p-2 rounded hover:bg-blue-50/50 cursor-pointer text-start transition-colors"
                      >
                        <div className="min-w-0 flex-1 pe-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                            <span className="font-mono text-blue-700 font-bold shrink-0">
                              #{doc.serialNumber}/{doc.year}
                            </span>
                            <span className="truncate">{doc.subject}</span>
                          </div>
                          {doc.correspondenceNumber && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {isRtl ? `رقم الإرسالية: ${doc.correspondenceNumber}` : `Réf : ${doc.correspondenceNumber}`}
                            </p>
                          )}
                        </div>
                        <CornerDownLeft className="w-3 h-3 text-slate-300 shrink-0 mt-1" />
                      </DropdownMenuItem>
                    ))}
                  </div>
                </div>
              )}

              {/* Catégorie 2 : Courriers sortants */}
              {results.outgoing.length > 0 && (
                <div>
                  {results.incoming.length > 0 && <DropdownMenuSeparator className="my-1" />}
                  <DropdownMenuLabel className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-emerald-900 bg-emerald-50/70 rounded">
                    <span className="flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      {isRtl ? 'البريد والوثائق الصادرة' : 'Courriers sortants'}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white border-emerald-200 text-emerald-700">
                      {results.outgoing.length}
                    </Badge>
                  </DropdownMenuLabel>
                  <div className="mt-1 space-y-0.5">
                    {results.outgoing.map((doc) => (
                      <DropdownMenuItem
                        key={`out-${doc._id}`}
                        onClick={() => handleSelect(`/dashboard/mail/outgoing/${doc._id}`)}
                        className="flex items-start justify-between p-2 rounded hover:bg-emerald-50/50 cursor-pointer text-start transition-colors"
                      >
                        <div className="min-w-0 flex-1 pe-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                            <span className="font-mono text-emerald-700 font-bold shrink-0">
                              #{doc.serialNumber}/{doc.year}
                            </span>
                            <span className="truncate">{doc.subject}</span>
                          </div>
                          {doc.typeDocument && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {doc.typeDocument}
                            </p>
                          )}
                        </div>
                        <CornerDownLeft className="w-3 h-3 text-slate-300 shrink-0 mt-1" />
                      </DropdownMenuItem>
                    ))}
                  </div>
                </div>
              )}

              {/* Catégorie 3 : Personnel RH */}
              {results.personnel.length > 0 && (
                <div>
                  {(results.incoming.length > 0 || results.outgoing.length > 0) && (
                    <DropdownMenuSeparator className="my-1" />
                  )}
                  <DropdownMenuLabel className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-purple-900 bg-purple-50/70 rounded">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                      {isRtl ? 'الموارد البشرية (الموظفين)' : 'Personnel RH'}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white border-purple-200 text-purple-700">
                      {results.personnel.length}
                    </Badge>
                  </DropdownMenuLabel>
                  <div className="mt-1 space-y-0.5">
                    {results.personnel.map((p) => (
                      <DropdownMenuItem
                        key={`pers-${p._id}`}
                        onClick={() => handleSelect(`/dashboard/hr/personnel/${p._id}`)}
                        className="flex items-start justify-between p-2 rounded hover:bg-purple-50/50 cursor-pointer text-start transition-colors"
                      >
                        <div className="min-w-0 flex-1 pe-2">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {p.nom} {p.prenom}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            {p.cin && <span>CIN: {p.cin}</span>}
                            {p.poste && <span>• {p.poste}</span>}
                            {p.activeDepartment?.name && (
                              <span className="truncate">• {p.activeDepartment.name}</span>
                            )}
                          </div>
                        </div>
                        <CornerDownLeft className="w-3 h-3 text-slate-300 shrink-0 mt-1" />
                      </DropdownMenuItem>
                    ))}
                  </div>
                </div>
              )}

              {/* Catégorie 4 : Utilisateurs */}
              {results.users.length > 0 && (
                <div>
                  {(results.incoming.length > 0 ||
                    results.outgoing.length > 0 ||
                    results.personnel.length > 0) && <DropdownMenuSeparator className="my-1" />}
                  <DropdownMenuLabel className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-amber-900 bg-amber-50/70 rounded">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-600" />
                      {isRtl ? 'حسابات المستخدمين' : 'Comptes utilisateurs'}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white border-amber-200 text-amber-700">
                      {results.users.length}
                    </Badge>
                  </DropdownMenuLabel>
                  <div className="mt-1 space-y-0.5">
                    {results.users.map((u) => (
                      <DropdownMenuItem
                        key={`usr-${u._id}`}
                        onClick={() => handleSelect('/dashboard/admin/users')}
                        className="flex items-start justify-between p-2 rounded hover:bg-amber-50/50 cursor-pointer text-start transition-colors"
                      >
                        <div className="min-w-0 flex-1 pe-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-800">
                              @{u.username}
                            </span>
                            <Badge variant="secondary" className="text-[10px] py-0 px-1 font-normal">
                              {u.role}
                            </Badge>
                          </div>
                          {u.activeDepartment?.name && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {u.activeDepartment.name}
                            </p>
                          )}
                        </div>
                        <CornerDownLeft className="w-3 h-3 text-slate-300 shrink-0 mt-1" />
                      </DropdownMenuItem>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default GlobalSearch;
