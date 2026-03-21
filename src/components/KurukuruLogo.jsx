import React from 'react';

const KurukuruLogo = ({ width = 180, height = 48 }) => {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 180 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0px 0px 8px rgba(133, 173, 255, 0.4))' }}
    >
      {/* Dynamic Glowing Hexbin (Fog of War Tile) */}
      <path 
        d="M24 4L42 14V34L24 44L6 34V14L24 4Z" 
        fill="url(#neon-grad)" 
        stroke="#85adff" 
        strokeWidth="1.5"
      />
      {/* Inner Radar/Scanner Ring */}
      <circle cx="24" cy="24" r="8" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="2 4" opacity="0.8" />
      <circle cx="24" cy="24" r="3" fill="#ffffff" />
      
      {/* Clean Space Grotesk Text */}
      <text 
        x="60" 
        y="32" 
        fontFamily="'Space Grotesk', sans-serif" 
        fontSize="28" 
        fontWeight="700" 
        letterSpacing="0.05em"
        fill="#ffffff"
      >
        Kurukuru
      </text>

      <defs>
        <linearGradient id="neon-grad" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#85adff" stopOpacity="0.8"/>
          <stop offset="1" stopColor="#0070eb" stopOpacity="0.1"/>
        </linearGradient>
      </defs>
    </svg>
  );
};

export default KurukuruLogo;
