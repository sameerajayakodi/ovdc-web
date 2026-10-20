import type { Metadata } from "next";
import Link from "next/link";
import { company } from "@/lib/data/content";
import { routes } from "@/lib/routes";
import { PageHero } from "@/components/ui/PageHero";
import c from "@/components/content/content.module.css";

export const metadata: Metadata = {
  title: "Privacy, terms & cookies",
  description: "How OVDC uses your personal data, the terms of use of this website and our cookie policy.",
};

/* Draft wording for review by OVDC's legal counsel before launch. */
export default function LegalPage() {
  return (
    <>
      <PageHero crumb="Legal" title="Privacy, terms & cookies" lead="Last updated October 2026." />
      <div className={c.section} style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start" }}>
        <nav aria-label="On this page" style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200, position: "sticky", top: 24 }}>
          <a href="#privacy">Privacy policy</a>
          <a href="#terms">Terms of use</a>
          <a href="#cookies">Cookie policy</a>
        </nav>
        <div className={c.prose} style={{ flex: 1, minWidth: 0 }}>
          <h2 id="privacy">Privacy policy</h2>
          <p>
            {company.name} (“OVDC”, “we”) respects your privacy and processes personal data in line with Sri Lanka’s Personal Data Protection Act,
            No. 9 of 2022.
          </p>
          <h3>What we collect</h3>
          <ul>
            <li>Details you give us in forms: name, mobile number, email, country, the project or unit you are interested in, and your message.</li>
            <li>Your preferences on this site (currency, shortlist, cookie choice), stored in your browser.</li>
            <li>With your consent, anonymous usage statistics such as pages visited and tours opened.</li>
          </ul>
          <h3>How we use it</h3>
          <ul>
            <li>To respond to your enquiry, arrange visits and send the documents you request.</li>
            <li>To send launch and construction updates if you subscribe — you can unsubscribe at any time.</li>
            <li>To improve the website and our service.</li>
          </ul>
          <h3>Sharing</h3>
          <p>
            We do not sell personal data. We share it only with service providers who help us run our business (for example, hosting and messaging
            providers), with partner banks when you ask us to, or where the law requires.
          </p>
          <h3>Your rights</h3>
          <p>
            You may ask to see, correct or delete your data, or withdraw consent, by writing to <a href={`mailto:${company.email}`}>{company.email}</a>.
          </p>

          <h2 id="terms">Terms of use</h2>
          <p>
            Information on this website, including prices, availability, floor plans, specifications and images, is provided in good faith for
            general information and may change without notice. Images and 360° tours may be artist’s impressions or show-apartment photographs and
            are indicative only.
          </p>
          <p>
            Prices shown in currencies other than LKR are indicative conversions. Nothing on this website is an offer or a contract; your rights and
            obligations are set out only in the reservation form and sale agreement.
          </p>
          <p>Content on this website is owned by OVDC or used under licence and may not be reproduced without permission. Photo credits are listed on the <Link href={routes.credits}>credits page</Link>.</p>

          <h2 id="cookies">Cookie policy</h2>
          <p>We use a small number of browser storage items:</p>
          <ul>
            <li>
              <strong>Essential:</strong> your currency choice, your shortlist and your cookie preference. These stay in your browser and are not sent to us.
            </li>
            <li>
              <strong>Analytics (only if you choose “Accept all”):</strong> anonymous statistics that help us understand which pages and tours are useful.
            </li>
          </ul>
          <p>You can change your choice at any time by clearing this site’s data in your browser.</p>
        </div>
      </div>
    </>
  );
}
