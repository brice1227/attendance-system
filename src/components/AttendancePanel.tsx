import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { AttendanceLog, Member, Event } from '../types';
import { ClipboardCheck, CheckCircle, XCircle, Clock, Save } from 'lucide-react';

interface Props {
  schoolYearId: string | null;
  onError: (msg: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'absent', label: 'Absent', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'late', label: 'Late', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'excused', label: 'Excused', icon: Clock, color: 'text-blue-600 bg-blue-50 border-blue-200' },
];

export default function AttendancePanel({ schoolYearId, onError }: Props) {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [attendance, setAttendance] = useState<Record<string, { status: string; notes: string }>>({});
  const [viewEvent, setViewEvent] = useState('');
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'take' | 'view'>('take');

  const fetchData = useCallback(async () => {
    if (!schoolYearId) return;
    try {
      const [membersRes, eventsRes] = await Promise.all([
        supabase
          .from('members')
          .select('*')
          .eq('school_year_id', schoolYearId)
          .eq('status', 'active')
          .order('last_name', { ascending: true }),
        supabase
          .from('events')
          .select('*')
          .eq('school_year_id', schoolYearId)
          .order('event_date', { ascending: false }),
      ]);
      if (membersRes.error) throw membersRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (membersRes.data) setMembers(membersRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
    } catch {
      onError('Could not load attendance data — check your database connection.');
    }
  }, [schoolYearId, onError]);

  const fetchLogs = useCallback(async () => {
    if (!schoolYearId) return;
    try {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*, members(first_name, last_name), events(name)')
        .eq('school_year_id', schoolYearId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setLogs(data as AttendanceLog[]);
    } catch {
      onError('Could not load attendance records.');
    }
  }, [schoolYearId, onError]);

  useEffect(() => {
    fetchData();
    fetchLogs();
  }, [fetchData, fetchLogs]);

  async function loadExistingAttendance(eventId: string) {
    try {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('event_id', eventId);
      if (error) throw error;
      if (data) {
        const map: Record<string, { status: string; notes: string }> = {};
        for (const log of data) {
          map[log.member_id] = { status: log.status, notes: log.notes || '' };
        }
        setAttendance(map);
      }
    } catch {
      onError('Could not load existing attendance for this event.');
    }
  }

  function handleSelectEvent(eventId: string) {
    setSelectedEvent(eventId);
    if (eventId) {
      const initial: Record<string, { status: string; notes: string }> = {};
      for (const m of members) {
        initial[m.id] = { status: 'present', notes: '' };
      }
      setAttendance(initial);
      loadExistingAttendance(eventId);
    }
  }

  function setStatus(memberId: string, status: string) {
    setAttendance((prev) => ({
      ...prev,
      [memberId]: { ...prev[memberId], status, notes: prev[memberId]?.notes || '' },
    }));
  }

  function setNotes(memberId: string, notes: string) {
    setAttendance((prev) => ({
      ...prev,
      [memberId]: { ...prev[memberId], notes, status: prev[memberId]?.status || 'present' },
    }));
  }

  async function handleSave() {
    if (!selectedEvent || !schoolYearId) return;
    setSaving(true);
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('attendance_logs')
        .select('member_id')
        .eq('event_id', selectedEvent);
      if (fetchErr) throw fetchErr;

      const existingIds = new Set((existing || []).map((r) => r.member_id));

      for (const [memberId, val] of Object.entries(attendance)) {
        if (!val.status) continue;
        const payload = {
          member_id: memberId,
          event_id: selectedEvent,
          school_year_id: schoolYearId,
          status: val.status,
          notes: val.notes || null,
        };
        if (existingIds.has(memberId)) {
          const { error } = await supabase
            .from('attendance_logs')
            .update({ status: payload.status, notes: payload.notes })
            .eq('member_id', memberId)
            .eq('event_id', selectedEvent);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('attendance_logs').insert(payload);
          if (error) throw error;
        }
      }
      await fetchLogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onError(`Failed to save attendance — ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  const filteredLogs = viewEvent ? logs.filter((l) => l.event_id === viewEvent) : logs;

  const eventAttendanceSummary = events.map((ev) => {
    const evLogs = logs.filter((l) => l.event_id === ev.id);
    return {
      ...ev,
      present: evLogs.filter((l) => l.status === 'present').length,
      absent: evLogs.filter((l) => l.status === 'absent').length,
      late: evLogs.filter((l) => l.status === 'late').length,
      excused: evLogs.filter((l) => l.status === 'excused').length,
      total: evLogs.length,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          <button
            onClick={() => setMode('take')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'take' ? 'bg-yellow-500 text-black' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Take Attendance
          </button>
          <button
            onClick={() => setMode('view')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'view' ? 'bg-yellow-500 text-black' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            View Records
          </button>
        </div>
      </div>

      {mode === 'take' ? (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Select Event
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => handleSelectEvent(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white"
            >
              <option value="">Choose an event...</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} — {new Date(ev.event_date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          {selectedEvent && members.length > 0 && (
            <>
              <div className="space-y-2">
                {members.map((member) => {
                  const a = attendance[member.id] || { status: 'present', notes: '' };
                  return (
                    <div key={member.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-800">
                          {member.last_name}, {member.first_name}
                        </span>
                        <div className="flex gap-1.5">
                          {STATUS_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            const active = a.status === opt.value;
                            return (
                              <button
                                key={opt.value}
                                onClick={() => setStatus(member.id, opt.value)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                  active ? opt.color : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={a.notes}
                        onChange={(e) => setNotes(member.id, e.target.value)}
                        className="w-full border border-slate-100 rounded-lg px-3 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      />
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-xl px-6 py-3 text-sm disabled:opacity-50 transition-colors shadow-sm w-full justify-center"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </>
          )}

          {selectedEvent && members.length === 0 && (
            <div className="text-center py-12">
              <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No active members to take attendance for.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <select
              value={viewEvent}
              onChange={(e) => setViewEvent(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white"
            >
              <option value="">All events</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} — {new Date(ev.event_date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          {!viewEvent && eventAttendanceSummary.length > 0 && (
            <div className="grid gap-3">
              {eventAttendanceSummary.map((ev) =>
                ev.total > 0 ? (
                  <button
                    key={ev.id}
                    onClick={() => setViewEvent(ev.id)}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-800">{ev.name}</span>
                      <span className="text-xs text-slate-400">{ev.total} records</span>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-emerald-600 font-medium">{ev.present} present</span>
                      <span className="text-red-600 font-medium">{ev.absent} absent</span>
                      <span className="text-amber-600 font-medium">{ev.late} late</span>
                      <span className="text-blue-600 font-medium">{ev.excused} excused</span>
                    </div>
                  </button>
                ) : null
              )}
            </div>
          )}

          {viewEvent && filteredLogs.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Member</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => {
                    const opt = STATUS_OPTIONS.find((o) => o.value === log.status);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">
                          {log.members
                            ? `${log.members.last_name}, ${log.members.first_name}`
                            : 'Unknown'}
                        </td>
                        <td className="px-4 py-3">
                          {opt && (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${opt.color}`}>
                              <opt.icon className="w-3 h-3" />
                              {opt.label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">{log.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No attendance records yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
