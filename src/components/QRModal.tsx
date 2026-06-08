import { useEffect, useState } from 'react';
import { X, ExternalLink, Smartphone, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { Event } from '../types';

const LOGO = '/AD18CAE9-9E71-4087-857F-CB96B7402546.png';

interface Props {
  event: Event;
  onClose: () => void;
  onCheckin?: () => void;
}

type SimState = 'ready' | 'submitting' | 'success' | 'error';

function PhoneSimulator({ event, onBack }: { event: Event; onBack: () => void }) {
  const [code, setCode] = useState('');
  const [simState, setSimState] = useState<SimState>('ready');
  const [inputError, setInputError] = useState('');
  const [checkedInMember, setCheckedInMember] = useState('');

  async function handleCheckin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setInputError('Code must be exactly 6 characters.');
      return;
    }
    setInputError('');
    setSimState('submitting');

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
        setSimState('ready');
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
        if (existing.status === 'present') {
          setInputError('Already checked in for this event!');
          setSimState('success');
          return;
        }
        await supabase
          .from('attendance_logs')
          .update({ status: 'present', notes: 'QR Check-in (Simulated)' })
          .eq('id', existing.id);
      } else {
        const { error: insertErr } = await supabase
          .from('attendance_logs')
          .insert({
            member_id: member.id,
            event_id: event.id,
            school_year_id: event.school_year_id,
            status: 'present',
            notes: 'QR Check-in (Simulated)',
          });
        if (insertErr) throw insertErr;
      }

      setCheckedInMember(`${member.first_name} ${member.last_name}`);
      setSimState('success');
    } catch {
      setInputError('Something went wrong. Please try again.');
      setSimState('ready');
    }
  }

  function reset() {
    setCode('');
    setSimState('ready');
    setInputError('');
    setCheckedInMember('');
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* back link */}
      <button
        onClick={onBack}
        className="self-start flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors px-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to QR Code
      </button>

      {/* phone frame */}
      <div className="relative w-[300px] rounded-[2.5rem] bg-zinc-900 border-[6px] border-zinc-700 shadow-2xl overflow-hidden"
        style={{ minHeight: 580 }}>
        {/* notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-zinc-700 rounded-b-2xl z-10" />
        {/* status bar */}
        <div className="bg-black pt-8 pb-1 px-5 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 font-medium">9:41</span>
          <span className="text-[10px] text-zinc-500">●●●</span>
        </div>

        {/* screen content */}
        <div className="bg-black min-h-[490px] flex flex-col items-center justify-center px-5 py-4 gap-5">
          {simState === 'success' ? (
            <div className="flex flex-col items-center gap-5 text-center w-full">
              <img src={LOGO} alt="GMC" className="w-14 h-14 object-contain" />
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 animate-ping absolute" />
                <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center relative shadow-lg shadow-emerald-500/40">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-white text-lg font-bold">Check-in Confirmed!</h2>
                <p className="text-emerald-400 font-semibold text-sm mt-0.5">{checkedInMember}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 w-full text-left">
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-0.5">Event</p>
                <p className="text-white text-sm font-semibold">{event.name}</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {new Date(event.event_date).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>
              <button
                onClick={reset}
                className="text-xs text-zinc-500 hover:text-zinc-300 underline transition-colors"
              >
                Scan another code
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 w-full">
              <img src={LOGO} alt="GMC" className="w-14 h-14 object-contain" />
              <div className="text-center">
                <h2 className="text-white text-sm font-bold tracking-wide">GOLD MEMBERS</h2>
                <p className="text-zinc-500 text-[10px] tracking-widest uppercase mt-0.5">Event Check-In</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 w-full">
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-0.5">Event</p>
                <p className="text-white text-sm font-semibold">{event.name}</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {new Date(event.event_date).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </p>
              </div>
              <form onSubmit={handleCheckin} className="w-full space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Enter Your 6-Character Member Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => { setCode(e.target.value.toUpperCase()); setInputError(''); }}
                    placeholder="e.g. X7K2P9"
                    maxLength={6}
                    autoComplete="off"
                    className={`w-full bg-zinc-800 border rounded-xl px-3 py-3 text-white text-xl font-mono text-center tracking-[0.4em] placeholder-zinc-600 focus:outline-none focus:ring-2 transition-colors ${
                      inputError
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-zinc-600 focus:ring-yellow-500 focus:border-yellow-500'
                    }`}
                  />
                </div>
                {inputError && (
                  <div className="flex items-start gap-1.5 bg-red-950 border border-red-800 text-red-300 text-[11px] px-3 py-2 rounded-xl">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    {inputError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={simState === 'submitting' || code.trim().length === 0}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl text-sm tracking-wider uppercase transition-colors shadow-lg flex items-center justify-center gap-2"
                >
                  {simState === 'submitting' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                  ) : 'Check In'}
                </button>
              </form>
              <p className="text-zinc-700 text-[10px] text-center">
                Contact an administrator if you need help with your code.
              </p>
            </div>
          )}
        </div>

        {/* home bar */}
        <div className="bg-black pb-3 flex items-center justify-center">
          <div className="w-20 h-1 bg-zinc-700 rounded-full" />
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-yellow-950/60 border border-yellow-700/50 rounded-lg px-3 py-2 text-xs text-yellow-300 max-w-[300px]">
        <span className="text-yellow-400">💡</span>
        Test mode — logs saved to database and reflected live in the Members tab.
      </div>
    </div>
  );
}

export default function QRModal({ event, onClose }: Props) {
  const [showSim, setShowSim] = useState(false);
  const scanUrl = `${window.location.origin}${window.location.pathname}#/scan/${event.id}`;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-zinc-950 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${showSim ? 'w-full max-w-sm' : 'w-full max-w-sm'}`}>
        {/* header */}
        <div className="bg-black px-5 py-4 flex items-center justify-between border-b border-zinc-800">
          <div>
            <h2 className="text-white font-bold text-sm tracking-wide">
              {showSim ? 'MOBILE SIMULATOR' : 'ATTENDANCE QR CODE'}
            </h2>
            <p className="text-zinc-400 text-xs mt-0.5 truncate max-w-56">{event.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        <div className="p-5">
          {showSim ? (
            <PhoneSimulator event={event} onBack={() => setShowSim(false)} />
          ) : (
            <div className="flex flex-col items-center gap-4">
              {/* QR image */}
              <div className="bg-white p-3 rounded-xl border-2 border-zinc-800 shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(scanUrl)}`}
                  alt="Event Check-In QR Code"
                  className="w-[220px] h-[220px] block"
                />
              </div>

              {/* simulate button */}
              <button
                onClick={() => setShowSim(true)}
                className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl px-4 py-3 text-sm transition-colors shadow-md"
              >
                <Smartphone className="w-4 h-4" />
                Simulate Phone Scan (Test Mode)
              </button>

              {/* url row */}
              <div className="w-full">
                <p className="text-xs text-zinc-400 text-center mb-2">
                  Members scan this code to check in. Works on any phone camera.
                </p>
                <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-mono truncate flex-1">{scanUrl}</span>
                  <a
                    href={scanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 p-1 hover:bg-zinc-700 rounded transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                  </a>
                </div>
              </div>

              {/* date pill */}
              <div className="flex items-center gap-2 w-full bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
                <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                <p className="text-xs text-yellow-300 font-medium">
                  {new Date(event.event_date).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
