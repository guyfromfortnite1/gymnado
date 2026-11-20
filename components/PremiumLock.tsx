import Link from "next/link";
import PremiumSurface, { PremiumBadge } from "@/components/PremiumSurface";

/** Shown in place of a Premium feature for free users. The whole panel opens the Premium page. */
export default function PremiumLock({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href="/premium" className="group block rounded-2xl transition duration-200 hover:scale-[1.02]">
      <PremiumSurface className={`space-y-3 ${className}`}>
        <PremiumBadge />
        <p className="text-lg font-semibold">{title}</p>
        <div className="text-sm text-ice/90">{children}</div>
        <span className="inline-flex rounded-xl bg-white px-4 py-2 font-semibold text-navy transition group-hover:bg-ice">Upgrade to unlock</span>
      </PremiumSurface>
    </Link>
  );
}
