export function Logo({
  className = "",
  light = false,
  size = 26,
}: {
  className?: string;
  light?: boolean;
  size?: number;
}) {
  const text = light ? "text-white" : "text-ink";
  return (
    <span className={`inline-flex items-center gap-2.5 font-extrabold tracking-tightest ${className}`}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
        <defs>
          <linearGradient id="rk-logo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2C5282" />
            <stop offset="1" stopColor="#1E3A5F" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#rk-logo)" />
        <path d="M7 22V12l9-4.5L25 12v10" stroke="#fff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M12 22v-6h8v6" stroke="#2ECC71" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx="16" cy="13.5" r="1.5" fill="#2ECC71" />
      </svg>
      <span className={text}>Rentrik</span>
    </span>
  );
}
