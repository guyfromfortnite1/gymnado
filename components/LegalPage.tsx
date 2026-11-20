import Link from "next/link";
import Logo from "@/components/Logo";
import { LEGAL_UPDATED } from "@/lib/site";

/** Shared layout for the Terms, Privacy and Refund pages (readable by anyone, signed in or not). */
export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl space-y-4 pb-10">
      <Link href="/" className="inline-block"><Logo size={26} /></Link>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-sm text-twilight/60">Last updated {LEGAL_UPDATED}</p>
      <div className="legal space-y-3 leading-relaxed">{children}</div>
      <p className="border-t border-frost pt-4 text-sm text-twilight/60">
        <Link href="/terms" className="underline">Terms</Link> · <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/refund" className="underline">Refunds</Link>
      </p>
    </article>
  );
}
