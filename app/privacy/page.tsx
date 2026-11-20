import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Privacy Policy · ${SITE_NAME}` };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>This policy explains what information {SITE_NAME} collects, why, who we share it with, and the choices you have.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account:</strong> your email address and password (stored securely by our login provider; we never see your password).</li>
        <li><strong>Profile:</strong> your answers to the plan questions: units, sex, age, height, weight, activity level, experience, goal, muscles to prioritize, sports, training days and missing equipment.</li>
        <li><strong>Training and food:</strong> your plan, schedule, completed workouts, logged sets and weights, body weight entries, and the meals you save.</li>
        <li><strong>Food photos:</strong> when you scan a meal, the photo is sent to our AI provider to estimate the nutrition. We don&apos;t store the photo; we only save the meal details you choose to keep.</li>
        <li><strong>Coach chats:</strong> your messages to the AI coach and the replies are sent to our AI provider to answer you. The chat history is kept in your browser, not on our servers.</li>
        <li><strong>Payments:</strong> if you buy Premium, Stripe handles your payment details. We only receive your subscription status and a Stripe customer ID.</li>
        <li><strong>Usage counts:</strong> how many food scans and AI requests you&apos;ve made, to apply plan limits.</li>
      </ul>
      <p>Some of this is health-related information (like weight and training). We use it only to provide the features you ask for.</p>

      <h2>How we use it</h2>
      <p>To build and adjust your training plan, calculate your calorie and macro targets, run AI features, show your progress, process subscriptions, keep the Service secure, and prevent abuse. We don&apos;t sell your personal information, and we don&apos;t use it for advertising.</p>

      <h2>Who we share it with</h2>
      <p>Only the service providers we need to run {SITE_NAME}, each of which processes data on our behalf:</p>
      <ul>
        <li><strong>Supabase</strong>: database and login.</li>
        <li><strong>Anthropic</strong>: the AI (Claude) behind plan tuning, swaps, food scans, the coach and meal ideas.</li>
        <li><strong>Stripe</strong>: payments for Premium.</li>
        <li><strong>Netlify</strong>: website hosting.</li>
      </ul>
      <p>We may also share information if required by law.</p>

      <h2>Cookies</h2>
      <p>We use only the cookies needed to keep you logged in. We don&apos;t use advertising or tracking cookies.</p>

      <h2>How long we keep it</h2>
      <p>We keep your information while your account is open. If you ask us to delete your account, we delete your profile, plans, logs and other data, except anything we must keep by law (for example, payment records kept by Stripe).</p>

      <h2>Your choices and rights</h2>
      <p>You can view and change your answers anytime on the Profile tab. You can ask us for a copy of your data, to correct it, or to delete your account by emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Depending on where you live, you may have further rights under local privacy law, including the right to complain to your data protection authority.</p>

      <h2>Children</h2>
      <p>{SITE_NAME} isn&apos;t for children under 13, and we don&apos;t knowingly collect their information. If you think a child has signed up, contact us and we&apos;ll delete the account.</p>

      <h2>Security</h2>
      <p>Your data is protected by encryption in transit, secure logins, and database rules that let each user see only their own information. No system is perfectly secure, but we work to protect your data.</p>

      <h2>Changes and contact</h2>
      <p>We&apos;ll update this page if our practices change. Questions? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalPage>
  );
}
