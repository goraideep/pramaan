import { useEffect, useState } from 'react';
import { FileText, Users, FileCheck2, Clock, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/dashboard/stats').then((res) => setStats(res.data));
  }, []);

  const riskData = stats
    ? Object.entries(stats.riskDistribution).map(([level, count]) => ({ level, count }))
    : [];

  return (
    <Layout>
      <div className="mb-6">
        <p className="text-sm text-slate-500">Good day, {user?.name}</p>
        <h1 className="text-2xl font-bold text-navy-950">PRAMAAN Verification Dashboard</h1>
      </div>

      {!stats ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Active Tenders" value={stats.activeTenders} icon={FileText} />
            <StatCard label="Total Bidders" value={stats.totalBidders} icon={Users} />
            <StatCard label="Documents Processed" value={stats.documentsProcessed} icon={FileCheck2} />
            <StatCard label="Pending Verification" value={stats.pendingVerification} icon={Clock} accent="text-amber-600" />
            <StatCard label="Compliant Bidders" value={stats.compliantBidders} icon={ShieldCheck} accent="text-green-600" />
            <StatCard label="High Risk Bidders" value={stats.highRiskBidders} icon={ShieldAlert} accent="text-orange-600" />
            <StatCard label="Critical Discrepancies" value={stats.criticalDiscrepancies} icon={AlertTriangle} accent="text-red-600" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-semibold text-navy-950 mb-4">Risk Distribution</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={riskData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="level" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#1c3a7a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Layout>
  );
}
