/** Isometric grass-block brand mark. */
export default function CubeMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 92 92" aria-hidden="true">
      <polygon points="46,6 86,26 46,46 6,26" fill="#7DBB4A" stroke="#1F2A1D" strokeWidth="5" strokeLinejoin="round" />
      <polygon points="6,26 46,46 46,88 6,68" fill="#8A5A35" stroke="#1F2A1D" strokeWidth="5" strokeLinejoin="round" />
      <polygon points="86,26 46,46 46,88 86,68" fill="#6B4423" stroke="#1F2A1D" strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}
