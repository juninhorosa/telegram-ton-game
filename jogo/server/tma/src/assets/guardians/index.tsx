// Guardian SVG components
export function AetherSprite() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <radialGradient id="aether-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#475569" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="40" fill="url(#aether-glow)" />
      <circle cx="50" cy="50" r="20" fill="#94a3b8" opacity="0.6" />
      <circle cx="45" cy="42" r="4" fill="#e2e8f0" />
      <circle cx="55" cy="42" r="4" fill="#e2e8f0" />
      <path d="M42 55 Q50 62 58 55" stroke="#e2e8f0" strokeWidth="2" fill="none" />
      <path d="M35 30 L50 20 L65 30" stroke="#94a3b8" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function StormSentinel() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <radialGradient id="storm-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="40" fill="url(#storm-glow)" />
      <polygon points="50,15 60,40 85,40 65,55 72,80 50,65 28,80 35,55 15,40 40,40" fill="#3b82f6" opacity="0.7" />
      <circle cx="42" cy="45" r="5" fill="#93c5fd" />
      <circle cx="58" cy="45" r="5" fill="#93c5fd" />
      <path d="M44 58 L50 55 L56 58" stroke="#93c5fd" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function VoidTitan() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <radialGradient id="titan-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#581c87" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="40" fill="url(#titan-glow)" />
      <rect x="35" y="25" width="30" height="40" rx="5" fill="#a855f7" opacity="0.7" />
      <rect x="30" y="65" width="12" height="20" rx="3" fill="#a855f7" opacity="0.5" />
      <rect x="58" y="65" width="12" height="20" rx="3" fill="#a855f7" opacity="0.5" />
      <circle cx="43" cy="40" r="4" fill="#e9d5ff" />
      <circle cx="57" cy="40" r="4" fill="#e9d5ff" />
      <rect x="44" y="50" width="12" height="3" rx="1" fill="#e9d5ff" />
    </svg>
  );
}

export function CosmicLeviathan() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <radialGradient id="cosmic-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#eab308" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#713f12" stopOpacity="0" />
        </radialGradient>
        <filter id="cosmic-shadow">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      <circle cx="50" cy="50" r="45" fill="url(#cosmic-glow)" filter="url(#cosmic-shadow)" />
      <polygon points="50,10 58,35 85,35 63,52 72,78 50,62 28,78 37,52 15,35 42,35" fill="#eab308" opacity="0.8" />
      <circle cx="44" cy="42" r="5" fill="#fef3c7" />
      <circle cx="56" cy="42" r="5" fill="#fef3c7" />
      <path d="M40 55 Q50 65 60 55" stroke="#fef3c7" strokeWidth="2" fill="none" />
      <circle cx="50" cy="30" r="8" fill="#fbbf24" opacity="0.5" />
    </svg>
  );
}

export const GUARDIAN_SVG: Record<string, React.FC> = {
  "Aether Sprite": AetherSprite,
  "Storm Sentinel": StormSentinel,
  "Void Titan": VoidTitan,
  "Cosmic Leviathan": CosmicLeviathan,
};
