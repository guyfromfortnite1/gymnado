import Link from "next/link";
import PremiumSurface, { PremiumBadge } from "@/components/PremiumSurface";

/** Shown in place of a Premium feature for free users. */
export default function PremiumLock({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <PremiumSurface className={`space-y-3 ${className}`}>
      <PremiumBadge />
      <p className="text-lg font-semibold">{title}</p>
      <div className="text-sm text-cyan/90">{children}</div>
      <Link href="/premium" className="inline-flex rounded-xl bg-white px-4 py-2 font-semibold text-twilight transition duration-200 hover:scale-105 hover:bg-cyan">
        Upgrade to unlock
      </Link>
    </PremiumSurface>
  );
}
