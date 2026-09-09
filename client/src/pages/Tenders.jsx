import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';

export default function Tenders() {
  const { user } = useAuth();
  const [tenders, setTenders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tenderId: '', title: '', estimatedValue: '' });
  const [error, setError] = useState('');

  function load() {
    api.get('/tenders').then((res) => setTenders(res.data));
  }
  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/tenders', {
        ...form,
        estimatedValue: Number(form.estimatedValue) || 0,
        requirements: [
          { key: 'gst', label: 'GST Registration', category: 'Tax', mandatory: true, weight: 15 },
          { key: 'pan', label: 'PAN', category: 'Identity', mandatory: true, weight: 10 },
          { key: 'udyam', label: 'Udyam / MSME Registration', category: 'Registration', mandatory: true, weight: 10 },
          { key: 'turnover', label: 'Minimum Annual Turnover', category: 'Financial', mandatory: true, weight: 25, threshold: '100000000' },
          { key: 'oem', label: 'OEM Authorization', category: 'OEM', mandatory: true, weight: 25 },
          { key: 'income_tax', label: 'Income Tax Compliance', category: 'Tax', mandatory: false, weight: 15 },
        ],
      });
      setShowForm(false);
      setForm({ tenderId: '', title: '', estimatedValue: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy-950">Tenders</h1>
        {user?.role === 'officer' && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-1 bg-navy-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-navy-800"
          >
            <Plus className="w-4 h-4" /> Create Tender
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-5 mb-6 space-y-3 max-w-lg">
          <div>
            <label className="text-sm font-medium text-slate-700">Tender ID</label>
            <input required value={form.tenderId} onChange={(e) => setForm({ ...form, tenderId: e.target.value })}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="CPCL/PROC/2026/002" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Supply of ..." />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Estimated Value (₹)</label>
            <input type="number" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="bg-navy-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-navy-800">
            Save Tender
          </button>
          <p className="text-xs text-slate-400">A standard set of 6 compliance requirements is attached automatically. Edit them from the API/DB if needed.</p>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-sm">
        {tenders.map((t) => (
          <Link key={t._id} to={`/tenders/${t._id}`} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
            <div>
              <p className="font-semibold text-navy-950">{t.title}</p>
              <p className="text-xs text-slate-500">{t.tenderId} · {t.organization}</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full capitalize">{t.status}</span>
          </Link>
        ))}
        {tenders.length === 0 && <p className="px-5 py-6 text-sm text-slate-500">No tenders yet.</p>}
      </div>
    </Layout>
  );
}
