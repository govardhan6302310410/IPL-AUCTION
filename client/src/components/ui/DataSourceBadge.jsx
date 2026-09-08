import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function DataSourceBadge({ source, size = 'sm' }) {
  const isDemo = source === 'demo';
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses}`}
      style={{
        backgroundColor: isDemo ? 'rgba(245, 166, 35, 0.15)' : 'rgba(16, 185, 129, 0.15)',
        color: isDemo ? 'var(--gold-primary)' : 'var(--sold-green)'
      }}>
      {isDemo ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
      {isDemo ? 'DEMO DATA' : source?.toUpperCase()}
    </span>
  );
}
