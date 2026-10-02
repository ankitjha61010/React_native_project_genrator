import React from 'react';
import { Activity } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center space-x-4">
        {/* Backend status pill */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>API Connected</span>
          <span className="text-slate-400 font-mono text-[10px]">({API_BASE_URL.replace(/https?:\/\//, '')})</span>
        </div>
      </div>
    </header>
  );
};
