import React from 'react';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'primary' | 'secondary' | 'admin' | 'success' | 'warning' | 'danger' | 'neutral';
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  className = '',
  ...props
}) => {
  let colorClass = '';

  switch (variant) {
    case 'primary':
      colorClass = 'bg-[#FFC200]/15 text-[#D4A000] border border-[#FFC200]/20';
      break;
    case 'secondary':
      colorClass = 'bg-white/5 text-gray-300 border border-white/10';
      break;
    case 'admin':
      colorClass = 'bg-[#FFC200]/10 text-[#FFC200] border border-[#FFC200]/20';
      break;
    case 'success':
      colorClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      break;
    case 'warning':
      colorClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      break;
    case 'danger':
      colorClass = 'bg-red-500/10 text-red-400 border border-red-500/20';
      break;
    case 'neutral':
      colorClass = 'bg-gray-100 text-gray-600 border border-gray-200';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-display text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${colorClass} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
