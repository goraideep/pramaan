import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { UploadCloud, PlayCircle, FileText } from 'lucide-react';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';

const DOC_CATEGORIES = [
  'GST Certificate', 'PAN', 'Udyam/MSME Certificate', 'Turnover Certificate',
  'OEM Authorization', 'Income Tax', 'MCA Document', 'Other',
];

function scoreColor(score) {
  if (score >= 75) return 'text-green-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export default function BidderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [bidder, setBidder] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [uploadCategory, setUploadCategory] = useState(DOC_CATEGORIES[0]);
  const [decisionStatus, setDecisionStatus] = useState('QUALIFIED');
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [message, setMessage] = useState('');

  function load() {
    api.get(`/bidders/${id}`).then((res) => {
      setBidder(res.data.bidder);
      setDocuments(res.data.documents);
    });
  }
  useEffect(load, [id]);

  async function handleUpload(e) {
    e.preventDefault();
    const file = e.target.file.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('category', uploadCategory);
    setBusy(true);
    setMessage('');
    try {
      await api.post(`/bidders/${id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage('Document uploaded and processed.');
      e.target.reset();
      load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setBusy(true);
    setMessage('');
    try {
      await api.post(`/bidders/${id}/verify`);
      setMessage('Verification run complete.');
      load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDecision(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await api.post(`/bidders/${id}/decision`, {
        status: decisionStatus,
        reason: decisionReason,
        remarks: decisionRemarks,
      });
      setMessage('Decision recorded.');
      load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!bidder) return <Layout><p className="text-sm text-slate-500">Loading...</p></Layout>;

  const summary = { PASS: 0, FAIL: 0, WARNING: 0, PENDING: 0 };
  bidder.complianceItems.forEach((i) => { summary[i.result] = (summary[i.result] || 0) + 1; });

  return (
    <Layout>
      <div className="mb-6">
        <p className="text-xs text-slate-500">Compliance Command Center</p>
        <h1 className="text-2xl font-bold text-navy-950">{bidder.name}</h1>
      </div>

      {/* Score header */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
          <p className="text-xs text-slate-500 mb-1">Compliance Score</p>
          <p className={`text-4xl font-bold ${scoreColor(bidder.complianceScore)}`}>{bidder.complianceScore}<span className="text-lg text-slate-400">/100</span></p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
          <p className="text-xs text-slate-500 mb-1">Risk Level</p>
          <p className="text-2xl font-bold mb-1"><Badge tone={bidder.riskLevel}>{bidder.riskLevel}</Badge></p>
          <p className="text-xs text-slate-400">Risk score: {bidder.riskScore}/100</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500 mb-2 text-center">Result Summary</p>
          <div className="flex justify-around text-sm">
            <span className="text-green-600 font-semibold">{summary.PASS} PASS</span>
            <span className="text-amber-600 font-semibold">{summary.WARNING} WARN</span>
            <span className="text-red-600 font-semibold">{summary.FAIL} FAIL</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={handleVerify} disabled={busy}
          className="flex items-center gap-2 bg-navy-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-navy-800 disabled:opacity-60">
          <PlayCircle className="w-4 h-4" /> Run Verification
        </button>
      </div>
      {message && <p className="text-sm text-navy-700 mb-4">{message}</p>}

      {/* AI recommendation */}
      {bidder.aiRecommendation && (
        <div className="bg-navy-950 text-white rounded-xl p-5 mb-6">
          <p className="text-xs uppercase tracking-wide text-emerald-400 mb-2">
            PRAMAAN {bidder.aiMode === 'gemini' ? 'AI Analysis' : 'Demo AI Mode'}
          </p>
          <p className="text-sm leading-relaxed text-white/90">{bidder.aiRecommendation}</p>
        </div>
      )}

      {/* Compliance items / evidence */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-navy-950 mb-3">Compliance Evidence</h2>
        <div className="space-y-2">
          {bidder.complianceItems.map((item) => (
            <div key={item.key} className="border border-slate-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm text-navy-950">{item.label}</p>
                <Badge tone={item.result}>{item.result.replace('_', ' ')}</Badge>
              </div>
              <div className="grid sm:grid-cols-3 gap-2 mt-2 text-xs text-slate-500">
                <p><span className="text-slate-400">Expected: </span>{item.expected || '—'}</p>
                <p><span className="text-slate-400">Extracted: </span>{item.extracted || '—'}</p>
                <p><span className="text-slate-400">Source: </span>{item.sourceDocument || 'N/A'}{item.confidence != null ? ` · ${item.confidence}% confidence` : ''}</p>
              </div>
            </div>
          ))}
          {bidder.complianceItems.length === 0 && <p className="text-sm text-slate-500">Run verification to generate compliance results.</p>}
        </div>
      </div>

      {/* Discrepancies */}
      {bidder.discrepancies.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-navy-950 mb-3">Cross-Document Discrepancies</h2>
          <div className="space-y-2">
            {bidder.discrepancies.map((d, i) => (
              <div key={i} className="border border-slate-100 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm text-navy-950">{d.field}</p>
                  <Badge tone={d.severity}>{d.severity.toUpperCase()}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">{d.explanation}</p>
                {d.documentA && (
                  <p className="text-xs text-slate-400 mt-1">
                    {d.documentA}: "{d.valueA}" {d.documentB && <>vs {d.documentB}: "{d.valueB}"</>}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-navy-950 mb-3">Documents</h2>
        {user?.role === 'officer' && (
          <form onSubmit={handleUpload} className="flex flex-wrap items-center gap-2 mb-4">
            <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}
              className="border border-slate-300 rounded-lg px-2 py-2 text-sm">
              {DOC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg" required className="text-sm" />
            <button type="submit" disabled={busy}
              className="flex items-center gap-1 bg-navy-900 text-white text-sm px-3 py-2 rounded-lg hover:bg-navy-800 disabled:opacity-60">
              <UploadCloud className="w-4 h-4" /> Upload
            </button>
          </form>
        )}
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc._id} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="font-medium text-navy-950">{doc.category}</p>
                  <p className="text-xs text-slate-400">{doc.originalName}</p>
                </div>
              </div>
              <span className="text-xs text-slate-400">
                {doc.processingStatus}{doc.extracted?.confidence ? ` · ${doc.extracted.confidence}%` : ''}
              </span>
            </div>
          ))}
          {documents.length === 0 && <p className="text-sm text-slate-500">No documents uploaded yet.</p>}
        </div>
      </div>

      {/* Decision */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-navy-950 mb-1">Final Officer Decision</h2>
        <p className="text-xs text-slate-500 mb-4">
          PRAMAAN is a decision-support system. Final procurement qualification/disqualification is determined solely by the authorized Procurement Officer.
        </p>

        {bidder.decision?.status && (
          <div className="mb-4 border border-slate-100 rounded-lg p-3">
            <Badge tone={bidder.decision.status}>{bidder.decision.status.replace('_', ' ')}</Badge>
            <p className="text-sm text-slate-600 mt-2">{bidder.decision.reason}</p>
            {bidder.decision.remarks && <p className="text-xs text-slate-400 mt-1">{bidder.decision.remarks}</p>}
          </div>
        )}

        {user?.role === 'officer' ? (
          <form onSubmit={handleDecision} className="space-y-3 max-w-lg">
            <select value={decisionStatus} onChange={(e) => setDecisionStatus(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="QUALIFIED">Qualified</option>
              <option value="DISQUALIFIED">Disqualified</option>
              <option value="CONDITIONALLY_QUALIFIED">Conditionally Qualified</option>
              <option value="NEEDS_CLARIFICATION">Needs Clarification</option>
            </select>
            <textarea required value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)}
              placeholder="Decision reason (required)" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" rows={2} />
            <textarea value={decisionRemarks} onChange={(e) => setDecisionRemarks(e.target.value)}
              placeholder="Officer remarks (optional)" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" rows={2} />
            <button type="submit" disabled={busy} className="bg-navy-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-navy-800 disabled:opacity-60">
              Submit Decision
            </button>
          </form>
        ) : (
          <p className="text-sm text-slate-500">Only a Procurement Officer can record the final decision.</p>
        )}
      </div>
    </Layout>
  );
}
