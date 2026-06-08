import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Event } from '../types';
import { CalendarPlus, Trash2, Edit2, Tag, X, QrCode } from 'lucide-react';
import QRModal from './QRModal';

interface Props {
  schoolYearId: string | null;
  onError: (msg: string) => void;
}

const EVENT_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'games', label: 'Games' },
  { value: 'chant_practices', label: 'Chant Practices' },
  { value: 'social', label: 'Social' },
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'community_service', label: 'Community Service' },
];

const TYPE_COLORS: Record<string, string> = {
  general: 'bg-slate-100 text-slate-700',
  meeting: 'bg-blue-50 text-blue-700',
  games: 'bg-orange-50 text-orange-700',
  chant_practices: 'bg-yellow-50 text-yellow-700',
  social: 'bg-pink-50 text-pink-700',
  fundraiser: 'bg-emerald-50 text-emerald-700',
  community_service: 'bg-teal-50 text-teal-700',
};

export default function EventsPanel({ schoolYearId, onError }: Props) {
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState('general');
  const [loading, setLoading] = useState(false);
  const [qrEvent, setQrEvent] = useState<Event | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!schoolYearId) return;
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('school_year_id', schoolYearId)
        .order('event_date', { ascending: false });
      if (error) throw error;
      if (data) setEvents(data);
    } catch {
      onError('Could not load events — check your database connection.');
    }
  }, [schoolYearId, onError]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  function startEdit(event: Event) {
    setEditId(event.id);
    setName(event.name);
    setDescription(event.description || '');
    setEventDate(event.event_date);
    setEventType(event.event_type);
    setShowForm(true);
  }

  function resetForm() {
    setName('');
    setDescription('');
    setEventDate('');
    setEventType('general');
    setShowForm(false);
    setEditId(null);
  }

  async function handleSubmit() {
    if (!name || !eventDate || !schoolYearId) return;
    setLoading(true);
    try {
      if (editId) {
        const { data, error } = await supabase
          .from('events')
          .update({ name, description: description || null, event_date: eventDate, event_type: eventType })
          .eq('id', editId)
          .select()
          .single();
        if (error) throw error;
        if (data) setEvents((prev) => prev.map((e) => (e.id === data.id ? data : e)));
      } else {
        const { data, error } = await supabase
          .from('events')
          .insert({
            school_year_id: schoolYearId,
            name,
            description: description || null,
            event_date: eventDate,
            event_type: eventType,
          })
          .select()
          .single();
        if (error) throw error;
        if (data) setEvents((prev) => [data, ...prev]);
      }
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onError(`Failed to save event — ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch {
      onError('Failed to delete event.');
    }
  }

  function getTypeLabel(type: string) {
    return EVENT_TYPES.find((t) => t.value === type)?.label || type;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{events.length} event{events.length !== 1 ? 's' : ''}</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors shadow-sm"
          >
            <CalendarPlus className="w-4 h-4" />
            Add Event
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">{editId ? 'Edit Event' : 'New Event'}</h3>
              <button onClick={resetForm} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Event name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
              />
              <div className="flex gap-3">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-3">
              <button onClick={resetForm} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !name || !eventDate}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg text-sm disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-12">
            <CalendarPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No events yet. Create your first event!</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-800">{event.name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${TYPE_COLORS[event.event_type] || TYPE_COLORS.general}`}>
                        {getTypeLabel(event.event_type)}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-slate-500 mb-2">{event.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Tag className="w-3 h-3 flex-shrink-0" />
                      {new Date(event.event_date).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setQrEvent(event)}
                      className="flex items-center gap-1.5 bg-black hover:bg-zinc-800 text-yellow-400 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                      title="Generate Attendance QR Code"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      QR Code
                    </button>
                    <button
                      onClick={() => startEdit(event)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {qrEvent && <QRModal event={qrEvent} onClose={() => setQrEvent(null)} />}
    </>
  );
}
