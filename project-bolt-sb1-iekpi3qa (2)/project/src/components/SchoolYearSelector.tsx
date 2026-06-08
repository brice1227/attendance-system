import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { SchoolYear } from '../types';
import { Calendar, ChevronDown, Plus } from 'lucide-react';

interface Props {
  activeYear: SchoolYear | null;
  onSelect: (year: SchoolYear) => void;
  onError: (msg: string) => void;
}

export default function SchoolYearSelector({ activeYear, onSelect, onError }: Props) {
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchYears();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchYears() {
    try {
      const { data, error } = await supabase
        .from('school_years')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      if (data) {
        setYears(data);
        const active = data.find((y) => y.is_active);
        if (active) onSelect(active);
        else if (data.length > 0) onSelect(data[0]);
      }
    } catch (err) {
      onError('Could not load school years — check your database connection.');
    }
  }

  async function handleCreate() {
    if (!name || !startDate || !endDate) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('school_years')
        .insert({ name, start_date: startDate, end_date: endDate, is_active: years.length === 0 })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setYears((prev) => [data, ...prev]);
        onSelect(data);
        resetForm();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onError(`Failed to create school year — ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(year: SchoolYear) {
    try {
      await supabase.from('school_years').update({ is_active: false }).neq('id', year.id);
      const { data, error } = await supabase
        .from('school_years')
        .update({ is_active: true })
        .eq('id', year.id)
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setYears((prev) => prev.map((y) => ({ ...y, is_active: y.id === data.id })));
        onSelect(data);
      }
    } catch {
      onError('Failed to switch active school year.');
    } finally {
      setShowDropdown(false);
    }
  }

  function resetForm() {
    setName('');
    setStartDate('');
    setEndDate('');
    setShowForm(false);
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Calendar className="w-4 h-4 text-slate-500" />
          {activeYear ? activeYear.name : 'Select Year'}
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Year
        </button>
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {years.map((year) => (
            <button
              key={year.id}
              onClick={() => handleActivate(year)}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between ${
                activeYear?.id === year.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
              }`}
            >
              <span className="font-medium">{year.name}</span>
              {year.is_active && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Active</span>
              )}
            </button>
          ))}
          {years.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400">No school years yet</p>
          )}
        </div>
      )}

      {showForm && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl p-5 shadow-xl z-50 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">New School Year</h3>
          <input
            type="text"
            placeholder="Year name (e.g. 2025-2026)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          />
          <div className="flex gap-3">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !name || !startDate || !endDate}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
