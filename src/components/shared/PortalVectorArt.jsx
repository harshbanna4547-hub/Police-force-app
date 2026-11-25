/**
 * [VECTOR ART] Crisp sculptural SVG illustrations & official Police Establishment emblem
 * Rendered cleanly without inline styles.
 */
export function PoliceCrestSvg({ className = "portal-crest-svg" }) {
  return (
    <svg viewBox="0 0 80 88" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="crestOuterGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#566848" />
          <stop offset="100%" stopColor="#273123" />
        </linearGradient>
        <linearGradient id="crestGoldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f1d9b3" />
          <stop offset="100%" stopColor="#b88d56" />
        </linearGradient>
      </defs>
      <path d="M40 4 L72 16 V44 C72 64 56 78 40 84 C24 78 8 64 8 44 V16 Z" fill="url(#crestOuterGrad)" stroke="url(#crestGoldGrad)" strokeWidth="3" />
      <path d="M40 12 L64 21 V43 C64 58 52 70 40 75 C28 70 16 58 16 43 V21 Z" fill="rgba(255,255,255,0.08)" stroke="rgba(241,217,179,0.5)" strokeWidth="1.2" />
      <polygon points="40,22 44.5,32 55,33 47,40.5 49,51 40,46 31,51 33,40.5 25,33 35.5,32" fill="url(#crestGoldGrad)" />
      <path d="M24 58 Q40 65 56 58" fill="none" stroke="url(#crestGoldGrad)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function ModuleArtworkSvg({ artType = "waves", className = "companion-art-svg" }) {
  if (artType === "stones") {
    return (
      <svg viewBox="0 0 220 120" className={className} aria-hidden="true">
        <defs>
          <linearGradient id="stoneA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6c8060" />
            <stop offset="100%" stopColor="#3e4e35" />
          </linearGradient>
          <linearGradient id="stoneB" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8b88a" />
            <stop offset="100%" stopColor="#c47448" />
          </linearGradient>
          <linearGradient id="stoneC" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9db4c0" />
            <stop offset="100%" stopColor="#4f697a" />
          </linearGradient>
        </defs>
        <ellipse cx="110" cy="96" rx="76" ry="18" fill="url(#stoneA)" />
        <ellipse cx="110" cy="70" rx="56" ry="15" fill="url(#stoneB)" />
        <ellipse cx="110" cy="46" rx="40" ry="13" fill="url(#stoneC)" />
        <ellipse cx="110" cy="24" rx="24" ry="10" fill="#f5efe6" stroke="#d8b489" strokeWidth="1.5" />
      </svg>
    );
  }

  if (artType === "ledger") {
    return (
      <svg viewBox="0 0 220 120" className={className} aria-hidden="true">
        <rect x="26" y="18" width="168" height="86" rx="16" fill="#eef1e9" stroke="#cbd5c7" strokeWidth="1.5" />
        <rect x="42" y="32" width="60" height="8" rx="4" fill="#435339" />
        <rect x="42" y="48" width="90" height="6" rx="3" fill="#9ca894" />
        <rect x="42" y="64" width="22" height="26" rx="5" fill="#6b805c" />
        <rect x="72" y="54" width="22" height="36" rx="5" fill="#d48352" />
        <rect x="102" y="42" width="22" height="48" rx="5" fill="#435339" />
        <circle cx="158" cy="64" r="22" fill="#d8b489" opacity="0.88" />
        <path d="M158 64 L158 42 A22 22 0 0 1 178 72 Z" fill="#435339" />
      </svg>
    );
  }

  if (artType === "shield" || artType === "badge") {
    return (
      <svg viewBox="0 0 220 120" className={className} aria-hidden="true">
        <rect x="24" y="14" width="172" height="92" rx="46" fill="#eef1e9" />
        <circle cx="72" cy="60" r="28" fill="#435339" opacity="0.16" />
        <circle cx="152" cy="60" r="24" fill="#d48352" opacity="0.2" />
        <path d="M110 22 L144 34 V58 C144 76 128 90 110 96 C92 90 76 76 76 58 V34 Z" fill="#435339" />
        <path d="M98 58 L107 67 L124 48" fill="none" stroke="#f5efe6" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Default sculptural wave peaks inspired by user's sage/terracotta wave aesthetic
  return (
    <svg viewBox="0 0 220 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="waveSageGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8ca29c" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#4f6660" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="waveAmberGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ecc39b" />
          <stop offset="100%" stopColor="#c47448" />
        </linearGradient>
      </defs>
      <rect x="12" y="10" width="196" height="100" rx="18" fill="#eef2ef" />
      <path d="M12 84 Q56 42 102 68 T190 48 L208 62 V110 H12 Z" fill="url(#waveSageGrad)" />
      <path d="M12 94 Q68 58 118 82 T208 70 V110 H12 Z" fill="url(#waveAmberGrad)" opacity="0.92" />
      <circle cx="48" cy="36" r="11" fill="#ffffff" stroke="#d8b489" strokeWidth="2" />
    </svg>
  );
}
