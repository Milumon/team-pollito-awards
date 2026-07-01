import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'light' | 'dark' | 'darker' | 'surface';
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'light',
  className = '',
  ...props
}) => {
  let variantClass = '';

  switch (variant) {
    case 'light':
      variantClass = 'bg-white border border-[#2D3139]/10 shadow-[0_4px_20px_rgba(0,0,0,0.04)]';
      break;
    case 'surface':
      // Modo claro ligeramente más cálido que blanco puro
      variantClass = 'bg-[#FDFBF7] border border-[#2D3139]/8 shadow-[0_2px_10px_rgba(0,0,0,0.04)]';
      break;
    case 'dark':
      // Surface principal en modo oscuro
      variantClass = 'bg-[#1E2128] border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]';
      break;
    case 'darker':
      // Fondo embebido / highlight en modo oscuro
      variantClass = 'bg-[#16181D] border border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.15)]';
      break;
  }

  return (
    <div
      className={`rounded-2xl ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
