import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showWordmark = true,
  className = '',
}) => {
  const dims = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-9 h-9' : 'w-7 h-7';
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg';

  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={dims}
        aria-hidden="true"
      >
        <path
          d="M16 2.5L4.5 7.2V15.4C4.5 22.35 9.4 28.65 16 30.2C22.6 28.65 27.5 22.35 27.5 15.4V7.2L16 2.5Z"
          fill="#0C1629"
          stroke="#22D3EE"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <path
          d="M12.75 12.25L8.75 16L12.75 19.75"
          stroke="#22D3EE"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19.25 12.25L23.25 16L19.25 19.75"
          stroke="#3B82F6"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17.2 10.8L14.8 21.2"
          stroke="#E2E8F0"
          strokeWidth="1.65"
          strokeLinecap="round"
        />
      </svg>
      {showWordmark && (
        <span className={`font-display font-bold tracking-tight text-slate-100 ${textSize}`}>
          REPOGUARD
        </span>
      )}
    </span>
  );
};
