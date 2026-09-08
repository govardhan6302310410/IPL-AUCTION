import React from 'react';

export default function LoadingSpinner({ size = 'md', text }) {
  const sizeMap = {
    sm: { container: 'w-6 h-6', border: 'border-2', dot: 'w-1.5 h-1.5' },
    md: { container: 'w-10 h-10', border: 'border-2.5', dot: 'w-2 h-2' },
    lg: { container: 'w-14 h-14', border: 'border-3', dot: 'w-2.5 h-2.5' }
  };

  const current = sizeMap[size] || sizeMap.md;

  return (
    <div className="flex flex-col items-center justify-center gap-3.5 py-10 select-none animate-fade-in">
      <div className="relative flex items-center justify-center">
        {/* Outer subtle glow ring */}
        <div
          className={`${current.container} rounded-full border border-cyan-500/20 animate-pulse`}
          style={{ boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)' }}
        />
        {/* Spinning primary ring */}
        <div
          className={`absolute ${current.container} ${current.border} rounded-full border-t-amber-400 border-r-cyan-400 border-b-transparent border-l-transparent animate-spin`}
          style={{ animationDuration: '0.9s' }}
        />
        {/* Center glowing dot */}
        <div className={`absolute ${current.dot} rounded-full bg-amber-400 shadow-sm`} />
      </div>

      {text && (
        <p className="text-xs md:text-sm font-medium tracking-wide text-[var(--text-secondary)]">
          {text}
        </p>
      )}
    </div>
  );
}
