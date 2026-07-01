import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'dark' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  let variantClass = '';

  switch (variant) {
    case 'primary':
      variantClass = 'bg-[#FFC200] hover:brightness-105 text-black';
      break;
    case 'secondary':
      variantClass = 'bg-[#2B2F37] hover:bg-[#353A44] text-white';
      break;
    case 'dark':
      variantClass = 'bg-[#1b1d22] hover:bg-[#23262d] text-white';
      break;
    case 'danger':
      variantClass = 'bg-red-500 hover:bg-red-600 text-white';
      break;
    case 'ghost':
      variantClass = 'bg-transparent hover:bg-white/5 text-gray-400 hover:text-white';
      break;
  }

  let sizeClass = '';
  switch (size) {
    case 'sm':
      sizeClass = 'px-3 py-1.5 text-xs';
      break;
    case 'md':
      sizeClass = 'px-4 py-2 text-sm';
      break;
    case 'lg':
      sizeClass = 'px-6 py-3 text-sm md:text-base';
      break;
  }

  return (
    <button
      className={`font-display font-semibold rounded-xl transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC200]/50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
