// The examiner's mark: a number circled by hand in red ink.
// `size` is the circle width in px. `animate` draws the circle once (respects reduced motion via CSS).
export function Mark({
  value,
  outOf,
  size = 84,
  animate = false,
  tone = "red",
}: {
  value: number | string;
  outOf?: number;
  size?: number;
  animate?: boolean;
  tone?: "red" | "ink";
}) {
  const label = outOf ? `${value} out of ${outOf}` : String(value);
  return (
    <span className={`mark mark-${tone} ${animate ? "mark-draw" : ""}`} style={{ width: size, height: size * 0.82 }} role="img" aria-label={label}>
      <svg viewBox="0 0 100 82" aria-hidden="true">
        {/* Slightly lopsided loop that overshoots its start, like a pen circle */}
        <path
          className="mark-loop"
          pathLength={1}
          d="M62 6 C 86 8, 97 26, 94 44 C 91 66, 68 79, 45 77 C 20 75, 4 60, 6 40 C 8 20, 28 6, 52 5 C 60 5, 70 7, 76 11"
        />
      </svg>
      <span className="mark-num" style={{ fontSize: size * (String(value).length > 2 ? 0.3 : 0.38) }}>
        {value}
        {outOf !== undefined && <small>/{outOf}</small>}
      </span>
    </span>
  );
}

export function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  );
}

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z" />
    </svg>
  );
}
