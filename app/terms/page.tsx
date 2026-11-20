import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { FREE_SCANS, PREMIUM_PRICE_LABEL } from "@/lib/premium";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = { title: `Terms of Service · ${SITE_NAME}` };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>These terms apply to your use of {SITE_NAME} at {SITE_URL} (the &quot;Service&quot;). By creating an account or using the Service, you agree to them. If you don&apos;t agree, please don&apos;t use the Service.</p>

      <h2>1. What GymNado does</h2>
      <p>{SITE_NAME} builds training plans and workout schedules from the answers you give, estimates calories and macros from meal photos, and (on Premium) offers an AI coach, progress tracking and meal ideas. Some features use artificial intelligence (AI), which can make mistakes.</p>

      <h2>2. Not medical advice</h2>
      <p>{SITE_NAME} is for general fitness and information only. It is not medical, nutritional or physiotherapy advice and doesn&apos;t replace a doctor or other qualified professional. Talk to a doctor before starting a new exercise or diet program, especially if you have a health condition, an injury, or are pregnant. Stop exercising and get medical help if you feel pain, dizziness or shortness of breath. You train at your own risk.</p>

      <h2>3. AI-generated content</h2>
      <p>Plans, exercise swaps, coach replies, food estimates and meal ideas are generated automatically and may be inaccurate or unsuitable for you. Calorie and macro estimates from photos are approximate. Use your own judgment and check anything important.</p>

      <h2>4. Your account</h2>
      <p>You must be at least 13 years old to use the Service (or the minimum age required where you live, if higher). If you&apos;re under 18, you need a parent&apos;s or guardian&apos;s permission. Keep your password safe; you&apos;re responsible for activity on your account. Give accurate information so your plan and targets make sense.</p>

      <h2>5. Free and Premium plans</h2>
      <p>The free plan includes {FREE_SCANS} food photo scans in total and the core training features. Premium costs {PREMIUM_PRICE_LABEL} (plus any applicable taxes) and unlocks unlimited food scans, sport-specific training, the AI coach, progress tracking and meal ideas.</p>
      <p>Premium is a subscription that <strong>renews automatically every month</strong> until you cancel. Payments are processed by Stripe; we never see or store your full card details. You can cancel anytime in Settings → Premium (&quot;Manage or cancel subscription&quot;). When you cancel, Premium stays active until the end of the period you&apos;ve paid for, and you won&apos;t be charged again. See our <a href="/refund">Refund Policy</a>. We may change the price in the future; we&apos;ll tell you in advance, and the new price applies from your next billing period.</p>

      <h2>6. Fair use</h2>
      <p>To keep the Service fast and affordable, AI features have daily limits per account. Don&apos;t misuse the Service: no trying to break its security, overload it, scrape it, get around limits or payments, or use it for anything illegal or harmful.</p>

      <h2>7. Your content</h2>
      <p>You own what you put into {SITE_NAME} (your answers, logs and photos). You give us permission to store and process it only to run the Service for you, as described in our <a href="/privacy">Privacy Policy</a>.</p>

      <h2>8. Availability and changes</h2>
      <p>We work to keep the Service running, but it may sometimes be unavailable or change. We may add, change or remove features. We may suspend or close accounts that break these terms.</p>

      <h2>9. Limitation of liability</h2>
      <p>The Service is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind, to the extent the law allows. To the extent the law allows, we aren&apos;t liable for injuries, health problems, or indirect or consequential losses arising from your use of the Service, and our total liability to you is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms limits rights you have under consumer law that can&apos;t be limited.</p>

      <h2>10. Changes to these terms</h2>
      <p>We may update these terms. If the changes are important, we&apos;ll let you know in the app or by email. Continuing to use the Service after changes take effect means you accept them.</p>

      <h2>11. Contact</h2>
      <p>Questions? Email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalPage>
  );
}
