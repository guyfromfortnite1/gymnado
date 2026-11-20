import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { PREMIUM_PRICE_LABEL } from "@/lib/premium";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Refund Policy · ${SITE_NAME}` };

export default function RefundPage() {
  return (
    <LegalPage title="Refund Policy">
      <h2>Cancel anytime</h2>
      <p>{SITE_NAME} Premium ({PREMIUM_PRICE_LABEL}) renews monthly. You can cancel anytime on the Premium tab under &quot;Manage or cancel subscription&quot;. After you cancel, you keep Premium until the end of the month you&apos;ve already paid for, and you won&apos;t be charged again.</p>

      <h2>Refunds</h2>
      <p>Because you can cancel at any time and keep access until the end of your paid period, we don&apos;t usually give refunds for partial months.</p>
      <p>We will refund you if:</p>
      <ul>
        <li>you were charged by mistake (for example, charged twice, or charged after cancelling), or</li>
        <li>Premium didn&apos;t work for you because of a problem on our side that we couldn&apos;t fix.</li>
      </ul>
      <p>To ask for a refund, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> within 14 days of the charge, with the email address of your account. Approved refunds go back to your original payment method, usually within 5–10 business days.</p>
      <p>If the law where you live gives you additional rights (for example, a cooling-off period), those rights apply and this policy doesn&apos;t limit them.</p>
    </LegalPage>
  );
}
