import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Demerit, Member, Event } from '../types';
import { AlertTriangle, Plus, Trash2, X } from 'lucide-react';

interface Props {
  schoolYearId: string | null;
  onError: (msg: string) => void;
}

export default function DemeritsPanel({ schoolYearId, onError }: Props) {
  const [demerits, setDemerits] = useState<Demerit[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [eventId, setEventId] = useState('');
  const [reason, setReason] = useState('');
  const [points, setPoints] = useState('1');
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!schoolYearId) return;
    try {
      const [demeritsRes, membersRes, eventsRes] = await Promise.all([
        supabase
          .from('demerits')
          .select('*, members(first_name, last_name), events(name)')
          .eq('school_year_id', schoolYearId)
          .order('issued_date', { ascending: false }),
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
      if (demeritsRes.error) throw demeritsRes.error;
      if (membersRes.error) throw membersRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (demeritsRes.data) setDemerits(demeritsRes.data as Demerit[]);
      if (membersRes.data) setMembers(membersRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
    } catch {
      onError('Could not load demerits — check your database connection.');
    }
  }, [schoolYearId, onError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAdd() {
    if (!memberId || !reason || !schoolYearId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('demerits')
        .insert({
          member_id: memberId,
          event_id: eventId || null,
          school_year_id: schoolYearId,
          reason,
          points: parseInt(points) || 1,
          issued_date: issuedDate,
        })
        .select('*, members(first_name, last_name), events(name)')
        .single();
      if (error) throw error;
      if (data) {
        setDemerits((prev) => [data as Demerit, ...prev]);

        // Fire-and-forget notification — does not block the UI
        fetch('/.netlify/functions/send-demerit-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId,
            demeritId: data.id,
            reason,
            points: parseInt(points) || 1,
            issuedDate,
            eventName: data.events?.name ?? null,
          }),
        }).catch(() => {/* notification failure is non-fatal */});

        resetForm();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onError(`Failed to issue demerit — ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from('demerits').delete().eq('id', id);
      if (error) throw error;
      setDemerits((prev) => prev.filter((d) => d.id !== id));
    } catch {
      onError('Failed to delete demerit.');
    }
  }

  function resetForm() {
    setMemberId('');
    setEventId('');
    setReason('');
    setPoints('1');
    setIssuedDate(new Date().toISOString().split('T')[0]);
    setShowForm(false);
  }

  const totalPoints = demerits.reduce((sum, d) => sum + d.points, 0);

  const memberTotals = demerits.reduce<Record<string, { name: string; total: number }>>((acc, d) => {
    const mid = d.member_id;
    if (!acc[mid]) {
      acc[mid] = {
        name: d.members ? `${d.members.last_name}, ${d.members.first_name}` : 'Unknown',
        total: 0,
      };
    }
    acc[mid].total += d.points;
    return acc;
  }, {});

  const topOffenders = Object.values(memberTotals).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {demerits.length} demerit{demerits.length !== 1 ? 's' : ''} &middot; {totalPoints} total points
        </p>
        <button
          onClick={() => setShowForm(true)}
          disabled={members.length === 0}
          className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-xl px-4 py-2.5 text-sm disabled:opacity-50 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Issue Demerit
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Issue Demerit</h3>
            <button onClick={resetForm} className="p-1 hover:bg-slate-100 rounded-lg">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="space-y-3">
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white"
            >
              <option value="">Select member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.last_name}, {m.first_name}</option>
              ))}
            </select>
            <textarea
              placeholder="Reason for demerit"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
            />
            <div className="flex gap-3">
              <input
                type="number"
                placeholder="Points"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                min={1}
                max={10}
                className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
              <input
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white"
              >
                <option value="">No linked event</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-3">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={loading || !memberId || !reason}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Issue'}
            </button>
          </div>
        </div>
      )}

      {topOffenders.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Top Demerit Holders</h3>
          <div className="space-y-2">
            {topOffenders.map((entry, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{entry.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-400 rounded-full"
                      style={{ width: `${Math.min(100, (entry.total / (topOffenders[0]?.total || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-red-600 w-6 text-right">{entry.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {demerits.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No demerits recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Member</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Points</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Event</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demerits.map((demerit) => (
                <tr key={demerit.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">
                    {demerit.members
                      ? `${demerit.members.last_name}, ${demerit.members.first_name}`
                      : 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{demerit.reason}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-xs font-bold text-red-600">
                      {demerit.points}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {new Date(demerit.issued_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{demerit.events?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(demerit.id)}
                      className="p-1 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
