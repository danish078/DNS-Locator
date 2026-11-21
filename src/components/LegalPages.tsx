import { useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Cookie,
  FileText,
  Info,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import {
  clearCookieConsent,
  getSavedCookieConsent,
  saveCookieConsent,
  type CookieConsentChoice,
} from './CookieNoticeBanner';

export type LegalPageRoute =
  | 'about'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'disclaimer'
  | 'cookies-policy'
  | 'cookies-notice';

interface LegalPagesProps {
  page: LegalPageRoute;
  onNavigateHome: () => void;
  onNavigatePage: (page: LegalPageRoute) => void;
  onConsentChanged?: () => void;
}

const LEGAL_TABS: { id: LegalPageRoute; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
  { id: 'privacy', label: 'Privacy Policy' },
  { id: 'terms', label: 'Terms and Conditions' },
  { id: 'disclaimer', label: 'Disclaimer' },
  { id: 'cookies-policy', label: 'Cookies Policy' },
  { id: 'cookies-notice', label: 'Cookies Notice' },
];

export default function LegalPages({
  page,
  onNavigateHome,
  onNavigatePage,
  onConsentChanged,
}: LegalPagesProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General Question');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<{
    referenceId: string;
    receivedAt: string;
  } | null>(null);

  const [consentChoice, setConsentChoice] = useState<CookieConsentChoice>(
    () => getSavedCookieConsent().choice
  );

  const handleContactSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Unable to send message. Please check your entries.');
      } else {
        setSubmitSuccess({ referenceId: data.referenceId, receivedAt: data.receivedAt });
        setName('');
        setEmail('');
        setMessage('');
      }
    } catch {
      setSubmitError('Network error while submitting your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateConsent = (choice: Exclude<CookieConsentChoice, null>) => {
    saveCookieConsent(choice);
    setConsentChoice(choice);
    onConsentChanged?.();
  };

  const handleResetConsent = () => {
    clearCookieConsent();
    setConsentChoice(null);
    onConsentChanged?.();
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-300 self-start cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{t('backToTool')}</span>
        </button>

        <nav
          aria-label="Policy and company pages"
          className="flex flex-wrap items-center gap-1.5 text-xs font-medium"
        >
          {LEGAL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigatePage(tab.id)}
              className={`px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                page === tab.id
                  ? 'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
        {page === 'about' && (
          <>
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-sky-400 mb-2">
                <Info className="w-4 h-4" aria-hidden="true" />
                <span>{t('navAbout')}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                {t('aboutTitle')}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('aboutSubtitle')}
              </p>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>{t('aboutP1')}</p>
              <p>{t('aboutP2')}</p>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 p-4 text-sm text-slate-700 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-slate-100 block mb-1">
                  {t('nonAffiliationTitle')}
                </strong>
                {t('nonAffiliationBody')}
              </div>
            </div>
          </>
        )}

        {page === 'privacy' && (
          <>
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-sky-400 mb-2">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                <span>EU GDPR &amp; Google Policy Compliant</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                {t('privacyTitle')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('effectiveDate')}
              </p>
            </div>

            <div className="space-y-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {t('privacyS1Title')}
                </h2>
                <p>{t('privacyS1Body')}</p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  2. EU GDPR Legal Basis &amp; Data Collection Policy (Articles 5 &amp; 6)
                </h2>
                <p>
                  For visitors located in the European Economic Area (EEA), the United Kingdom, and Switzerland, DNS Locator processes minimal technical data strictly in accordance with the General Data Protection Regulation (GDPR — Regulation (EU) 2016/679):
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-1">
                  <li>
                    <strong className="text-slate-900 dark:text-slate-100">Legitimate Interests (GDPR Art. 6(1)(f)):</strong> Executing the public DNS lookup you explicitly request, resolving your regional language via IP country code, and enforcing a temporary 60-second in-memory rate limit to prevent automated abuse and DDoS attacks.
                  </li>
                  <li>
                    <strong className="text-slate-900 dark:text-slate-100">Consent (GDPR Art. 6(1)(a)):</strong> Storing optional preference settings or any future non-essential analytics/advertising identifiers, managed transparently through our Cookies Notice and withdrawable at any time.
                  </li>
                  <li>
                    <strong className="text-slate-900 dark:text-slate-100">Data Minimization &amp; No User Profiling:</strong> We do not require account registration, we do not build behavioral profiles, and we never sell personal data or query histories to third parties.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {t('privacyS2Title')}
                </h2>
                <p>{t('privacyS2Body')}</p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  4. Google Policies, AdSense &amp; Third-Party Advertising Disclosure
                </h2>
                <p>
                  DNS Locator is structured to follow Google Search quality guidelines and Google AdSense publisher policies. If Google AdSense or third-party advertising partners are active on this site, third-party vendors (including Google) may use cookies or local identifiers to serve ads based on prior visits—subject to your prior EEA/UK consent where required by law. Visitors may opt out of personalized advertising by visiting{' '}
                  <a
                    href="https://adssettings.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-700 dark:text-sky-400 underline"
                  >
                    Google Ads Settings
                  </a>{' '}
                  or{' '}
                  <a
                    href="https://www.aboutads.info"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-700 dark:text-sky-400 underline"
                  >
                    aboutads.info
                  </a>
                  .
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  5. Your Rights Under EU GDPR (Articles 15–22)
                </h2>
                <p>
                  Under EU data protection law, you have the right to request access to, rectification of, or erasure of any personal data held about you, the right to restrict or object to processing, the right to data portability, the right to withdraw consent at any time without affecting prior lawful processing, and the right to lodge a complaint with your local Data Protection Supervisory Authority.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {t('privacyS3Title')}
                </h2>
                <p>{t('privacyS3Body')}</p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {t('privacyS4Title')}
                </h2>
                <p>
                  {t('privacyS4Body')}{' '}
                  <button
                    type="button"
                    onClick={() => onNavigatePage('contact')}
                    className="text-sky-700 dark:text-sky-400 underline hover:text-sky-900 dark:hover:text-sky-300 cursor-pointer"
                  >
                    {t('navContact')}
                  </button>
                </p>
              </section>
            </div>
          </>
        )}

        {page === 'terms' && (
          <>
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-sky-400 mb-2">
                <FileText className="w-4 h-4" aria-hidden="true" />
                <span>Legal Agreement</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                Terms and Conditions
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('effectiveDate')}
              </p>
            </div>

            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  1. Acceptance &amp; Public Diagnostic Purpose
                </h2>
                <p>
                  By accessing or using DNS Locator, you agree to be bound by these Terms and Conditions. DNS Locator provides read-only lookups of publicly published DNS records. Information displayed here is provided &ldquo;as is&rdquo; without warranties of completeness, accuracy, or continuous availability. DNS Locator is not affiliated with ICANN, domain registries, or domain registrars.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  2. Acceptable Use &amp; Fair-Use Rate Limits
                </h2>
                <p>
                  Automated scraping, high-frequency bot polling, security scanning against unauthorized third-party infrastructure, or attempts to bypass per-IP rate limits (45 requests per minute) are strictly prohibited. Users remain solely responsible for how they interpret or apply DNS diagnostics to their own domains and networks.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  3. Intellectual Property
                </h2>
                <p>
                  All original user interface designs, educational guides, graphics, and documentation on DNS Locator remain the intellectual property of DNS Locator, except for publicly published DNS zone data retrieved on your behalf.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  4. Limitation of Liability
                </h2>
                <p>
                  To the maximum extent permitted by applicable law, DNS Locator and its maintainers shall not be liable for any indirect, incidental, special, or consequential damages arising from DNS misconfigurations, propagation delays, email delivery interruptions, or third-party resolver downtime.
                </p>
              </section>
            </div>
          </>
        )}

        {page === 'disclaimer' && (
          <>
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                <span>Important Notice</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                Disclaimer
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('effectiveDate')}
              </p>
            </div>

            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  1. General Informational &amp; Diagnostic Purpose
                </h2>
                <p>
                  All DNS records, propagation statuses, TTL indicators, email health checks (MX, SPF, DMARC), and troubleshooting articles published on DNS Locator are provided strictly for general informational and network-diagnostic purposes. They do not constitute legal, security, or professional IT SLA guarantees.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  2. Non-Affiliation Statement
                </h2>
                <p>
                  DNS Locator is an independent public web utility. We are not affiliated with, endorsed by, sponsored by, or connected to ICANN, IANA, domain name registries, domain registrars, or any third-party public DNS resolver operator.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  3. Accuracy of Regional Propagation &amp; Caching
                </h2>
                <p>
                  DNS resolution varies continuously across ISPs, recursive resolvers, GeoDNS/Anycast networks, and TTL expiration windows. A &ldquo;Propagated&rdquo; or &ldquo;Non-Propagated&rdquo; indicator reflects the live response observed from our 18 public DNS checkpoints at the moment of the query and may differ from your local ISP cache.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  4. External Links
                </h2>
                <p>
                  DNS Locator may contain outbound links to official standards or policy resources. We have no control over and assume no responsibility for the content, privacy policies, or practices of external websites.
                </p>
              </section>
            </div>
          </>
        )}

        {page === 'cookies-policy' && (
          <>
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-sky-400 mb-2">
                <Cookie className="w-4 h-4" aria-hidden="true" />
                <span>EU ePrivacy &amp; GDPR</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                Cookies Policy
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('effectiveDate')}
              </p>
            </div>

            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  1. How DNS Locator Uses Browser Storage &amp; Cookies
                </h2>
                <p>
                  DNS Locator prioritizes privacy and data minimization. By default, our core DNS diagnostic engine operates without setting invasive tracking cookies. Instead, we rely on strictly necessary local browser storage (<code className="font-mono text-xs">localStorage</code>) to store your theme preference, regional language choice, consent status, and a short-lived 5-minute DNS result cache.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  2. Categories of Storage Keys &amp; Cookies
                </h2>
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200">
                      <tr>
                        <th className="px-3.5 py-2.5 font-semibold">Key / Category</th>
                        <th className="px-3.5 py-2.5 font-semibold">Purpose</th>
                        <th className="px-3.5 py-2.5 font-semibold">Retention</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      <tr>
                        <td className="px-3.5 py-2.5 font-mono">dnslocator_cookie_consent_v1</td>
                        <td className="px-3.5 py-2.5">Stores your EU GDPR cookie notice choice (Essential vs Accept).</td>
                        <td className="px-3.5 py-2.5">Until cleared or reset</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2.5 font-mono">dnslocator_theme / dnslocator_lang</td>
                        <td className="px-3.5 py-2.5">Remembers Light/Dark mode and regional or English language choice.</td>
                        <td className="px-3.5 py-2.5">Persistent preference</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2.5 font-mono">dnslocator_cache_v1:* / history</td>
                        <td className="px-3.5 py-2.5">Caches recent DNS responses locally to prevent redundant queries.</td>
                        <td className="px-3.5 py-2.5">5 minutes (Cache)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  3. Third-Party &amp; Advertising Cookies (Google AdSense)
                </h2>
                <p>
                  Should third-party advertising networks (such as Google AdSense) be enabled on DNS Locator, Google and its partners may place cookies to measure ad performance or personalize ads strictly after obtaining valid GDPR consent from EEA/UK visitors.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  4. Managing or Disabling Cookies
                </h2>
                <p>
                  You can clear DNS Locator&apos;s local cache at any time via the <strong>Clear Cache</strong> button, update your preference on our{' '}
                  <button
                    type="button"
                    onClick={() => onNavigatePage('cookies-notice')}
                    className="text-sky-700 dark:text-sky-400 underline cursor-pointer"
                  >
                    Cookies Notice
                  </button>{' '}
                  page, or configure your browser to block or delete cookies.
                </p>
              </section>
            </div>
          </>
        )}

        {page === 'cookies-notice' && (
          <>
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-sky-400 mb-2">
                <Bell className="w-4 h-4" aria-hidden="true" />
                <span>GDPR Consent &amp; Transparency</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                Cookies Notice
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('effectiveDate')}
              </p>
            </div>

            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Under EU ePrivacy rules and the General Data Protection Regulation (GDPR), DNS Locator informs all visitors before storing or accessing non-essential data on your device. Strictly necessary browser storage required to perform your DNS lookup, enforce fair-use security, and remember your language/theme selection operates under legitimate functional necessity.
              </p>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Your Current Cookie &amp; Storage Preference
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      You may update or withdraw your consent at any time (GDPR Art. 7(3)).
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                    Status:{' '}
                    {consentChoice === 'all'
                      ? 'Accepted All'
                      : consentChoice === 'essential'
                        ? 'Essential Only'
                        : 'Not Yet Set'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateConsent('essential')}
                    className="h-9 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    Save Essential Only
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateConsent('all')}
                    className="h-9 px-4 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Accept All
                  </button>
                  {consentChoice !== null && (
                    <button
                      type="button"
                      onClick={handleResetConsent}
                      className="h-9 px-3 rounded-lg text-xs font-medium text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      Withdraw Consent &amp; Re-open Banner
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                For full technical tables and legal details, please review our{' '}
                <button
                  type="button"
                  onClick={() => onNavigatePage('cookies-policy')}
                  className="text-sky-700 dark:text-sky-400 underline cursor-pointer"
                >
                  Cookies Policy
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => onNavigatePage('privacy')}
                  className="text-sky-700 dark:text-sky-400 underline cursor-pointer"
                >
                  Privacy Policy
                </button>
                .
              </p>
            </div>
          </>
        )}

        {page === 'contact' && (
          <>
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-sky-400 mb-2">
                <Mail className="w-4 h-4" aria-hidden="true" />
                <span>Contact Support</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                {t('contactTitle')}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Report a resolver issue, submit a GDPR data inquiry, request a regional checkpoint, or ask a question about DNS diagnostics.
              </p>
            </div>

            {submitSuccess ? (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 p-5 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>Message Received</span>
                </div>
                <p className="text-sm text-emerald-800 dark:text-emerald-200">
                  Thank you for reaching out. Your reference ID is{' '}
                  <span className="font-mono font-semibold">{submitSuccess.referenceId}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitSuccess(null)}
                  className="text-xs font-medium text-emerald-900 dark:text-emerald-300 underline pt-1"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                {submitError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 px-3.5 py-2.5 text-sm text-rose-800 dark:text-rose-200"
                  >
                    {submitError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      minLength={2}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      Email Address
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-subject"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Topic
                  </label>
                  <select
                    id="contact-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="General Question">General Question</option>
                    <option value="Regional Resolver Request">Regional Resolver Request</option>
                    <option value="Bug or Accuracy Report">Bug or Accuracy Report</option>
                    <option value="GDPR & Privacy Inquiry">GDPR &amp; Privacy Inquiry</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="contact-message"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    minLength={10}
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your question or issue…"
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] dark:bg-sky-500 dark:hover:bg-sky-400 disabled:opacity-60 text-white dark:text-slate-950 text-sm font-semibold transition-colors cursor-pointer"
                >
                  {submitting ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
