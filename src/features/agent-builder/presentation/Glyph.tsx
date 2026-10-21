import type { ReactNode } from "react";

export type GlyphName = "robot" | "person" | "book" | "settings" | "api" | "info" | "cloud" | "link" | "plus" | "lock" | "check" | "trash" | "refresh" | "arrow-up" | "expand" | "minimize" | "building";

const drawings: Record<GlyphName, ReactNode> = {
  robot: <><rect x="5" y="8" width="14" height="11" rx="3" /><path d="M9 12h.01M15 12h.01M9 16h6M12 4v4M10 5h4" /></>,
  person: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>,
  book: <><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v17H7.5A2.5 2.5 0 0 0 5 22z" /><path d="M5 5.5V22M9 7h6M9 11h6" /></>,
  settings: <><path d="M4 6h6M14 6h6M4 12h2M10 12h10M4 18h8M16 18h4" /><circle cx="12" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="14" cy="18" r="2" /></>,
  api: <><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  cloud: <><path d="M7.5 18h9.2a4.3 4.3 0 0 0 .5-8.6A5.5 5.5 0 0 0 6.8 8 4.4 4.4 0 0 0 7.5 18z" /><path d="M12 12v7m-3-3 3 3 3-3" /></>,
  link: <><path d="M10 13.5 8.5 15a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0M14 10.5 15.5 9a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0M8.5 12h7" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3" /></>,
  check: <><path d="m5 12 4.5 4.5L19 7" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.5-3" /></>,
  "arrow-up": <><path d="M12 19V5M6 11l6-6 6 6" /></>,
  expand: <><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3" /></>,
  minimize: <><path d="M8 3v5H3M21 8h-5V3M16 21v-5h5M3 16h5v5" /></>,
  building: <><path d="M4 21V5a2 2 0 0 1 2-2h8v18M14 9h4a2 2 0 0 1 2 2v10M2 21h20" /><path d="M8 7h2M8 11h2M8 15h2M16 13h1M16 17h1" /></>,
};

export function Glyph({ name }: { name: GlyphName }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
    >
      {drawings[name]}
    </svg>
  );
}
