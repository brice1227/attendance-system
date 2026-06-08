import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Member, Event } from '../types';
import { PHONE_CARRIERS } from '../types';
import { UserPlus, Search, Trash2, Mail, GraduationCap, MoreHorizontal, RefreshCw } from 'lucide-react';

interface Props {
  schoolYearId: string | null;
  onError: (msg: string) => void;
}

interface AttendanceSlim {
  member_id: string;
  event_id: string;
  status: string;
}

interface DemeritSlim {
  member_id: string;
  points: number;
}

function statusSymbol(status: string | null) {
  if (status === 'present') {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 text-emerald-600 text-sm font-black">
        ✓
      </span>
    );
  }
  if (status === 'late') {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-yellow-50 text-yellow-500 text-xs font-black border border-yellow-200">
        L
      </span>
    );
  }
  if (status === 'excused') {
    return (
      <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-xs font-black border border-blue-200">
        EA
      </span>
    );
  }
  if (status === 'absent') {
    return (
      <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-xs font-black border border-red-200">
        UE
      </span>
    );
  }
  // No log filed — treated as unlogged unexcused absence
  return <span className="text-slate-300 text-sm select-none">—</span>;
}

export default function MembersPanel({ schoolYearId, onError }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [logs, setLogs] = useState<AttendanceSlim[]>([]);
  const [demerits, setDemerits] = useState<DemeritSlim[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [carrier, setCarrier] = useState('');
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!schoolYearId) return;
    setFetching(true);
    try {
      const [membersRes, eventsRes, logsRes, demeritsRes] = await Promise.all([
        supabase
          .from('members')
          .select('*')
          .eq('school_year_id', schoolYearId)
          .order('last_name', { ascending: true }),
        supabase
          .from('events')
          .select('*')
          .eq('school_year_id', schoolYearId)
          .order('event_date', { ascending: true }),
        supabase
          .from('attendance_logs')
          .select('member_id, event_id, status')
          .eq('school_year_id', schoolYearId),
        supabase
          .from('demerits')
          .select('member_id, points')
          .eq('school_year_id', schoolYearId),
      ]);
      if (membersRes.error) throw membersRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (logsRes.error) throw logsRes.error;
      if (demeritsRes.error) throw demeritsRes.error;
      setMembers(membersRes.data ?? []);
      setEvents(eventsRes.data ?? []);
      setLogs(logsRes.data ?? []);
      setDemerits(demeritsRes.data ?? []);
    } catch {
      onError('Could not load member data — check your database connection.');
    } finally {
      setFetching(false);
    }
  }, [schoolYearId, onError]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function getAttendanceRate(memberId: string): string {
    if (events.length === 0) return 'N/A';
    const attended = logs.filter(
      (l) => l.member_id === memberId && (l.status === 'present' || l.status === 'late')
    ).length;
    return `${Math.round((attended / events.length) * 100)}%`;
  }

  function getTotalDemerits(memberId: string): number {
    return demerits.filter((d) => d.member_id === memberId).reduce((sum, d) => sum + d.points, 0);
  }

  function getEventStatus(memberId: string, eventId: string): string | null {
    return logs.find((l) => l.member_id === memberId && l.event_id === eventId)?.status ?? null;
  }

  async function handleAdd() {
    if (!firstName || !lastName || !schoolYearId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .insert({
          school_year_id: schoolYearId,
          first_name: firstName,
          last_name: lastName,
          email: email || null,
          phone_number: phone || null,
          phone_carrier: carrier || null,
          grade: grade ? parseInt(grade) : null,
        })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setMembers((prev) => [...prev, data].sort((a, b) => a.last_name.localeCompare(b.last_name)));
        resetForm();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onError(`Failed to add member — ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch {
      onError('Failed to delete member.');
    } finally {
      setMenuOpen(null);
    }
  }

  async function toggleStatus(member: Member) {
    const newStatus = member.status === 'active' ? 'inactive' : 'active';
    try {
      const { data, error } = await supabase
        .from('members')
        .update({ status: newStatus })
        .eq('id', member.id)
        .select()
        .single();
      if (error) throw error;
      if (data) setMembers((prev) => prev.map((m) => (m.id === data.id ? data : m)));
    } catch {
      onError('Failed to update member status.');
    } finally {
      setMenuOpen(null);
    }
  }

  function resetForm() {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setCarrier('');
    setGrade('');
    setShowForm(false);
  }

  const filtered = members.filter(
    (m) =>
      m.first_name.toLowerCase().includes(search.toLowerCase()) ||
      m.last_name.toLowerCase().includes(search.toLowerCase()) ||
      (m.email && m.email.toLowerCase().includes(search.toLowerCase())) ||
      m.member_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAll}
            disabled={fetching}
            className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${fetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-slate-700"
            >
              <option value="">Year (optional)</option>
              <option value="1">Freshman</option>
              <option value="2">Sophomore</option>
              <option value="3">Junior</option>
              <option value="4">Senior</option>
            </select>
            <input
              type="tel"
              placeholder="Phone number (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-slate-700"
            >
              <option value="">Phone carrier (optional)</option>
              {PHONE_CARRIERS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end mt-3">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={loading || !firstName || !lastName}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            {members.length === 0 ? 'No members yet. Add your first member!' : 'No members match your search.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: `${640 + events.length * 100}px` }}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="sticky left-0 bg-slate-50 z-10 text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[180px]">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">
                    Year
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">
                    Attendance
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">
                    Demerits
                  </th>
                  {events.map((ev) => (
                    <th
                      key={ev.id}
                      className="text-center px-2 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28"
                      title={`${ev.name} — ${new Date(ev.event_date).toLocaleDateString()}`}
                    >
                      <div className="truncate max-w-[100px]">{ev.name}</div>
                      <div className="text-[10px] font-normal text-slate-400 normal-case tracking-normal mt-0.5 whitespace-nowrap">
                        ({new Date(ev.event_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })})
                      </div>
                    </th>
                  ))}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((member) => {
                  const rate = getAttendanceRate(member.id);
                  const pts = getTotalDemerits(member.id);
                  const rateNum = rate === 'N/A' ? null : parseInt(rate);
                  return (
                    <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                      <td className="sticky left-0 bg-white hover:bg-slate-50 z-10 px-4 py-3 border-r border-slate-100">
                        <div className="text-sm font-medium text-slate-800">
                          {member.last_name}, {member.first_name}
                        </div>
                        <div className="text-xs text-gray-400 italic">{member.member_code}</div>
                        {member.email && (
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                            <Mail className="w-3 h-3" />{member.email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {member.grade ? (
                          <span className="flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5" />
                            {member.grade === 1 ? 'Freshman' : member.grade === 2 ? 'Sophomore' : member.grade === 3 ? 'Junior' : member.grade === 4 ? 'Senior' : member.grade}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                          member.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-14">
                            {rateNum !== null && (
                              <div
                                className={`h-full rounded-full ${
                                  rateNum >= 80 ? 'bg-emerald-400' : rateNum >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                                }`}
                                style={{ width: `${rateNum}%` }}
                              />
                            )}
                          </div>
                          <span className={`text-xs font-semibold w-9 text-right ${
                            rate === 'N/A' ? 'text-slate-400' :
                            rateNum !== null && rateNum >= 80 ? 'text-emerald-600' :
                            rateNum !== null && rateNum >= 50 ? 'text-yellow-600' : 'text-red-500'
                          }`}>
                            {rate}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {pts > 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-xs font-bold text-red-600">
                            {pts}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      {events.map((ev) => (
                        <td key={ev.id} className="px-2 py-3 text-center">
                          {statusSymbol(getEventStatus(member.id, ev.id))}
                        </td>
                      ))}
                      <td className="px-3 py-3 relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                          className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4 text-slate-400" />
                        </button>
                        {menuOpen === member.id && (
                          <div className="absolute right-3 top-8 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                            <button
                              onClick={() => toggleStatus(member)}
                              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                              {member.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDelete(member.id)}
                              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <span className="flex items-center gap-2">
                                <Trash2 className="w-3.5 h-3.5" />Delete
                              </span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {filtered.length} member{filtered.length !== 1 ? 's' : ''}
              {events.length > 0 && ` · ${events.length} event${events.length !== 1 ? 's' : ''}`}
            </span>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="text-emerald-600 font-black text-sm leading-none">✓</span>
                Present
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-flex items-center justify-center px-1 rounded bg-yellow-50 text-yellow-500 text-[10px] font-black border border-yellow-200">L</span>
                Late
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-flex items-center justify-center px-1 rounded bg-red-50 text-red-600 text-[10px] font-black border border-red-200">UE</span>
                Unexcused
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-flex items-center justify-center px-1 rounded bg-blue-50 text-blue-600 text-[10px] font-black border border-blue-200">EA</span>
                Excused
              </span>
              <span className="flex items-center gap-1">
                <span className="text-slate-300 text-sm font-medium">—</span>
                No log
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
