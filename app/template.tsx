// Remounts on every navigation, so each page fades + scales in (see .fade-in in globals.css).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="fade-in">{children}</div>;
}
