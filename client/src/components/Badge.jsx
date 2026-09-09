// Small colored pill used everywhere to show PASS/FAIL/risk level/etc.
const STYLES = {
  PASS: 'bg-green-100 text-green-700 border-green-300',
  FAIL: 'bg-red-100 text-red-700 border-red-300',
  WARNING: 'bg-amber-100 text-amber-700 border-amber-300',
  PENDING: 'bg-slate-100 text-slate-600 border-slate-300',
  NOT_APPLICABLE: 'bg-slate-100 text-slate-500 border-slate-300',
  LOW: 'bg-green-100 text-green-700 border-green-300',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-300',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-300',
  CRITICAL: 'bg-red-100 text-red-700 border-red-300',
  low: 'bg-slate-100 text-slate-600 border-slate-300',
  medium: 'bg-amber-100 text-amber-700 border-amber-300',
  critical: 'bg-red-100 text-red-700 border-red-300',
  QUALIFIED: 'bg-green-100 text-green-700 border-green-300',
  DISQUALIFIED: 'bg-red-100 text-red-700 border-red-300',
  CONDITIONALLY_QUALIFIED: 'bg-amber-100 text-amber-700 border-amber-300',
  NEEDS_CLARIFICATION: 'bg-slate-100 text-slate-600 border-slate-300',
};

export default function Badge({ children, tone }) {
  const style = STYLES[tone] || STYLES[children] || 'bg-slate-100 text-slate-600 border-slate-300';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
      {children}
    </span>
  );
}
