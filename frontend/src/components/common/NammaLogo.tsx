import React from 'react';
import { Link } from 'react-router-dom';

interface NammaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  linkTo?: string;
  textColor?: string;
}

export const NammaLogo: React.FC<NammaLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  linkTo = '/',
  textColor,
}) => {
  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-11 w-11',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const subtitleSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  const content = (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Tamil Nadu Gopuram Crest in Maroon Rounded Badge */}
      <div
        className={`flex ${iconSizes[size]} shrink-0 items-center justify-center rounded-xl bg-[#800000] text-amber-100 shadow-sm transition-transform hover:scale-105`}
        title="NammaTN"
      >
        <svg
          viewBox="0 0 40 40"
          className="w-4/5 h-4/5 text-amber-100 drop-shadow-xs"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle sun burst / rays in top background */}
          <circle cx="20" cy="18" r="9" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1.5 1.5" opacity="0.6" />
          {/* Kalasam spire on top */}
          <path d="M20 4L20 8M18.5 7.5L21.5 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="20" cy="5.5" r="1.2" fill="currentColor" />
          {/* Tier 1 (Shikhara roof) */}
          <path d="M16 10C16 8.5 24 8.5 24 10L23 13H17L16 10Z" fill="currentColor" opacity="0.9" />
          {/* Tier 2 */}
          <path d="M14.5 13H25.5L25 17H15L14.5 13Z" fill="currentColor" />
          {/* Tier 3 */}
          <path d="M13.5 17H26.5L26 21.5H14L13.5 17Z" fill="currentColor" opacity="0.95" />
          {/* Tier 4 */}
          <path d="M12.5 21.5H27.5L27 26H13L12.5 21.5Z" fill="currentColor" />
          {/* Base Gopuram Gateway / Entrance arch */}
          <path d="M11 26H29V34H11V26Z" fill="currentColor" />
          {/* Arched doorway */}
          <path d="M17 34V29.5C17 28.1 18.3 27 20 27C21.7 27 23 28.1 23 29.5V34H17Z" fill="#800000" />
          {/* Pillar / niches accents */}
          <line x1="14" y1="28" x2="14" y2="33" stroke="#800000" strokeWidth="1" />
          <line x1="26" y1="28" x2="26" y2="33" stroke="#800000" strokeWidth="1" />
          {/* Small decorative stars / lotus petal flourishes */}
          <circle cx="10" cy="33" r="1" fill="currentColor" opacity="0.8" />
          <circle cx="30" cy="33" r="1" fill="currentColor" opacity="0.8" />
        </svg>
      </div>

      <div className="flex flex-col leading-none">
        <span
          className={`font-black tracking-tight ${titleSizes[size]} ${
            textColor || 'text-stone-900 dark:text-stone-100'
          }`}
        >
          NammaTN
        </span>
        {showSubtitle && (
          <span
            className={`font-semibold tracking-wide font-tamil text-[#800000] dark:text-rose-400 mt-0.5 ${subtitleSizes[size]}`}
          >
            நம்ம தமிழ்நாடு
          </span>
        )}
      </div>
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo}>{content}</Link>;
  }

  return content;
};
