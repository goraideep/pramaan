import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';

export default function TenderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [tender, setTender] = useState(null);
  const [bidders, setBidders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function load() {
    api.get(`/tenders/${id}`).then((res) => setTender(res.data));
    api.get(`/tenders/${id}/bidders`).then((res) => setBidders(res.data));
  }
  useEffect(load, [id]);

  async function handleAddBidder(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/tenders/${id}/bidders`, { name });
      setName('');
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!tender) return <Layout><p className="text-sm text-slate-500">Loading...</p></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <p className="text-xs text-slate-500">{tender.tenderId}</p>
        <h1 className="text-2xl font-bold text-navy-950">{tender.title}</h1>
        <p className="text-sm text-slate-500 mt-1">{tender.organization} · {tender.department}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Estimated Value</p>
          <p className="font-semibold text-navy-950">₹{(tender.estimatedValue / 10000000).toFixed(2)} Cr</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Requirements</p>
          <p className="font-semibold text-navy-950">{tender.requirements.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Bidders</p>
          <p className="font-semibold text-navy-950">{bidders.length}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-navy-950 mb-3">Eligibility Requirements</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {tender.requirements.map((r) => (
            <div key={r.key} className="flex items-center justify-between text-sm border border-slate-100 rounded-lg px-3 py-2">
              <span>{r.label}</span>
              <span className="text-xs text-slate-400">weight {r.weight}{r.mandatory ? ' · mandatory' : ''}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-navy-950">Bidders</h2>
        {user?.role === 'officer' && (
          <button onClick={() => setShowForm((s) => !s)} className="flex items-center gap-1 text-sm bg-navy-900 text-white px-3 py-1.5 rounded-lg hover:bg-navy-800">
            <Plus className="w-4 h-4" /> Add Bidder
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAddBidder} className="bg-white border border-slate-200 rounded-xl p-4 mb-4 flex gap-2 max-w-md">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Bidder company name"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <button type="submit" className="bg-navy-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-navy-800">Add</button>
        </form>
      )}
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-sm">
        {bidders.map((b) => (
          <Link key={b._id} to={`/bidders/${b._id}`} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
            <div>
              <p className="font-semibold text-navy-950">{b.name}</p>
              <p className="text-xs text-slate-500">Status: {b.verificationStatus.replace('_', ' ')}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-navy-800">{b.complianceScore}/100</span>
              <Badge tone={b.riskLevel}>{b.riskLevel}</Badge>
            </div>
          </Link>
        ))}
        {bidders.length === 0 && <p className="px-5 py-6 text-sm text-slate-500">No bidders added yet.</p>}
      </div>
    </Layout>
  );
}
