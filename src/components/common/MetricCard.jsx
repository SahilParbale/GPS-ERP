import React from 'react';
import { 
  Cpu, Cog, CheckCircle2, Truck, Wrench, AlertTriangle, 
  DollarSign, TrendingUp, TrendingDown 
} from 'lucide-react';

const iconMap = {
  Cpu,
  Cog,
  CheckCircle2,
  Truck,
  Wrench,
  AlertTriangle,
  DollarSign
};

export default function MetricCard({ label, value, trend, isUp, alert, icon, onClick }) {
  const IconComponent = iconMap[icon] || Cpu;

  return (
    <div 
      className={`metric-card ${alert ? 'metric-alert' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <div className="metric-icon-wrap">
          <IconComponent size={16} />
        </div>
      </div>
      <div className="metric-value">{value}</div>
      {trend && (
        <div className="metric-footer">
          {isUp ? (
            <TrendingUp size={14} className="metric-trend-up" />
          ) : (
            <TrendingDown size={14} className="metric-trend-down" />
          )}
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}
