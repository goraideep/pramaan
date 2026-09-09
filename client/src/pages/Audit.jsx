import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/api';

export default function Audit() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get('/audit').then((res) => setLogs(res.data));
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-navy-950 mb-6">Audit Trail</h1>
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {logs.map((log) => (
          <div key={log._id} className="px-5 py-3 flex items-start justify-between text-sm">
            <div>
              <p className="font-medium text-navy-950">{log.action.replace(/_/g, ' ')}</p>
              <p className="text-xs text-slate-500">{log.details}</p>
            </div>
            <div className="text-right text-xs text-slate-400 whitespace-nowrap ml-4">
              <p>{log.userName}</p>
              <p>{new Date(log.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
        {logs.length === 0 && <p className="px-5 py-6 text-sm text-slate-500">No audit entries yet.</p>}
      </div>
    </Layout>
  );
}
