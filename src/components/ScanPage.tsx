import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const LOGO = '/AD18CAE9-9E71-4087-857F-CB96B7402546.png';

interface EventInfo {
  id: string;
  name: string;
  event_date: string;
  school_year_id: string;
}

type PageState = 'loading' | 'ready' | 'submitting' | 'success' | 'error' | 'notfound';

interface Props {
  eventId: string;
}

export default function ScanPage({ eventId }: Props) {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [code, setCode] = useState('');
  const [inputError, setInputError] = useState('');
  const [checkedInMember, setCheckedInMember] = useState('');

  useEffect(() => {
    async function loadEvent() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, name, event_date, school_year_id')
          .eq('id', eventId)
          .maybeSingle();
        if (error) throw error;
        if (!data) { setPageState('notfound'); return; }
        setEvent(data);
        setPageState('ready');
      } catch {
        setPageState('notfound');
      }
    }
    loadEvent();
  }, [eventId]);

  async function handleCheckin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setInputError('Code must be exactly 6 characters.');
      return;
    }
    if (!event) return;
    setInputError('');
    setPageState('submitting');

    try {
      const { data: member, error: memberErr } = await supabase
        .from('members')
        .select('id, first_name, last_name, school_year_id')
        .eq('member_code', trimmed)
        .eq('school_year_id', event.school_year_id)
        .maybeSingle();

      if (memberErr) throw memberErr;

      if (!member) {
        setInputError('No member found with that code. Please check and try again.');
        setPageState('ready');
        return;
      }

      const { data: existing } = await supabase
        .from('attendance_logs')
        .select('id, status')
        .eq('member_id', member.id)
        .eq('event_id', event.id)
        .maybeSingle();

      if (existing) {
        setCheckedInMember(`${member.first_name} ${member.last_name}`);
        setInputError(
          existing.status === 'present'
            ? 'You have already checked in for this event!'
            : ''
        );
        if (existing.status === 'present') {
          setPageState('success');
          return;
        }
        await supabase
          .from('attendance_logs')
          .update({ status: 'present', notes: 'QR Check-in' })
          .eq('id', existing.id);
      } else {
        const { error: insertErr } = await supabase
          .from('attendance_logs')
          .insert({
            member_id: member.id,
            event_id: event.id,
            school_year_id: event.school_year_id,
            status: 'present',
            notes: 'QR Check-in',
          });
        if (insertErr) throw insertErr;
      }

      setCheckedInMember(`${member.first_name} ${member.last_name}`);
      setPageState('success');
    } catch {
      setInputError('Something went wrong. Please try again.');
      setPageState('ready');
    }
  }

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
      </div>
    );
  }

  if (pageState === 'notfound') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-center">
        <img src={LOGO} alt="GMC" className="w-24 h-24 object-contain mb-6 opacity-60" />
        <h1 className="text-white text-xl font-bold mb-2">Event Not Found</h1>
        <p className="text-zinc-400 text-sm max-w-xs">
          This QR code is invalid or the event has been removed.
        </p>
      </div>
    );
  }

  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm flex flex-col items-center text-center gap-6">
          <img src={LOGO} alt="GMC" className="w-20 h-20 object-contain" />

          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 animate-ping absolute" />
            <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center relative shadow-lg shadow-emerald-500/40">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
          </div>

          <div>
            <h1 className="text-white text-2xl font-bold mb-1">Check-in Confirmed!</h1>
            <p className="text-emerald-400 font-semibold text-lg">{checkedInMember}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl px-6 py-4 w-full">
            <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Event</p>
            <p className="text-white font-semibold">{event?.name}</p>
            <p className="text-zinc-500 text-sm mt-0.5">
              {event && new Date(event.event_date).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric',
              })}
            </p>
          </div>

          <p className="text-zinc-600 text-xs">You're all set! Your attendance has been recorded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <img src={LOGO} alt="GMC" className="w-20 h-20 object-contain" />

        <div className="text-center">
          <h1 className="text-white text-xl font-bold tracking-wide">GOLD MEMBERS</h1>
          <p className="text-zinc-400 text-xs tracking-widest uppercase mt-0.5">Event Check-In</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-4 w-full">
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-0.5">Event</p>
          <p className="text-white font-semibold">{event?.name}</p>
          <p className="text-zinc-500 text-sm mt-0.5">
            {event && new Date(event.event_date).toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            })}
          </p>
        </div>

        <form onSubmit={handleCheckin} className="w-full space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Enter Your 6-Character Member Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setInputError(''); }}
              placeholder="e.g. X7K2P9"
              maxLength={6}
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              className={`w-full bg-zinc-800 border rounded-xl px-4 py-4 text-white text-2xl font-mono text-center tracking-[0.4em] placeholder-zinc-600 focus:outline-none focus:ring-2 transition-colors ${
                inputError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-zinc-600 focus:ring-yellow-500 focus:border-yellow-500'
              }`}
            />
          </div>

          {inputError && (
            <div className="flex items-start gap-2 bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {inputError}
            </div>
          )}

          <button
            type="submit"
            disabled={pageState === 'submitting' || code.trim().length === 0}
            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-4 rounded-xl text-base tracking-wider uppercase transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            {pageState === 'submitting' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              'Check In'
            )}
          </button>
        </form>

        <p className="text-zinc-600 text-xs text-center">
          Your member code was assigned when you joined. Contact an administrator if you need help.
        </p>
      </div>
    </div>
  );
}
