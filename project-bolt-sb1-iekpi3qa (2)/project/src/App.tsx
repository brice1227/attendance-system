import { useState, useEffect } from 'react';
import type { SchoolYear, Tab } from './types';
import SchoolYearSelector from './components/SchoolYearSelector';
import MembersPanel from './components/MembersPanel';
import EventsPanel from './components/EventsPanel';
import DemeritsPanel from './components/DemeritsPanel';
import AttendancePanel from './components/AttendancePanel';
import ToastContainer from './components/ToastContainer';
import ScanPage from './components/ScanPage';
import { useToast } from './lib/useToast';
import { Users, Calendar, AlertTriangle, ClipboardCheck, Lock } from 'lucide-react';

const LOGO = '/AD18CAE9-9E71-4087-857F-CB96B7402546.png';
const PASSCODE = 'January@2011!';

const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: 'members', label: 'Members', icon: Users },
  { key: 'events', label: 'Events', icon: Calendar },
  { key: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { key: 'demerits', label: 'Demerits', icon: AlertTriangle },
];

function useRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const handler = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return hash;
}

function PasscodeGate({ onUnlock }: { onUnlock: () => void }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === PASSCODE) {
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setInput('');
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center w-full max-w-sm">
        <img src={LOGO} alt="GMC Logo" className="w-52 h-52 object-contain mb-8 select-none" draggable={false} />

        <div className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white text-xl font-bold text-center mb-1 tracking-wide">GOLD MEMBERS</h2>
          <p className="text-zinc-400 text-xs text-center mb-6 tracking-widest uppercase">Admin Dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Access Passcode
              </label>
              <input
                type="password"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(false); }}
                placeholder="Enter passcode..."
                autoFocus
                className={`w-full bg-zinc-800 border rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 transition-colors ${
                  error ? 'border-red-500 focus:ring-red-500' : 'border-zinc-600 focus:ring-yellow-500 focus:border-yellow-500'
                }`}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-950 border border-red-700 text-red-400 text-sm px-4 py-2.5 rounded-xl">
                <Lock className="w-4 h-4 flex-shrink-0" />
                Invalid Passcode
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl text-sm tracking-wider uppercase transition-colors shadow-lg"
            >
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ onLock }: { onLock: () => void }) {
  const [activeYear, setActiveYear] = useState<SchoolYear | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const { toasts, addToast, removeToast } = useToast();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-black border-b border-zinc-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={LOGO} alt="GMC Logo" className="w-10 h-10 object-contain select-none" draggable={false} />
              <div>
                <h1 className="text-base font-bold text-white leading-tight tracking-wide">GOLD MEMBERS</h1>
                <p className="text-xs text-zinc-400">Admin Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <SchoolYearSelector activeYear={activeYear} onSelect={setActiveYear} onError={addToast} />
              <button
                onClick={onLock}
                className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
              >
                <Lock className="w-4 h-4" />
                Lock
              </button>
            </div>
          </div>
        </div>
      </header>

      {activeYear ? (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <nav className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-6 shadow-sm">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                  activeTab === key ? 'bg-yellow-500 text-black shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>

          {activeTab === 'members' && <MembersPanel schoolYearId={activeYear.id} onError={addToast} />}
          {activeTab === 'events' && <EventsPanel schoolYearId={activeYear.id} onError={addToast} />}
          {activeTab === 'attendance' && <AttendancePanel schoolYearId={activeYear.id} onError={addToast} />}
          {activeTab === 'demerits' && <DemeritsPanel schoolYearId={activeYear.id} onError={addToast} />}
        </main>
      ) : (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
          <img src={LOGO} alt="GMC Logo" className="w-24 h-24 object-contain mx-auto mb-6 opacity-20" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Welcome to the Admin Dashboard</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Create or select a school year above to start managing your club's members, events, attendance, and demerits.
          </p>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function App() {
  const hash = useRoute();
  const [unlocked, setUnlocked] = useState(false);

  const scanMatch = hash.match(/^#\/scan\/([^/]+)$/);
  if (scanMatch) {
    return <ScanPage eventId={scanMatch[1]} />;
  }

  if (!unlocked) {
    return <PasscodeGate onUnlock={() => setUnlocked(true)} />;
  }

  return <Dashboard onLock={() => setUnlocked(false)} />;
}

export default App;
