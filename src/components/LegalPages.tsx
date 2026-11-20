import { useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, Info, Mail, ShieldCheck } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export type LegalPageRoute = 'about' | 'privacy' | 'terms' | 'contact';

interface LegalPagesProps {
  page: LegalPageRoute;
  onNavigateHome: () => void;
  onNavigatePage: (page: LegalPageRoute) => void;
}

export default function LegalPages({
  page,
  onNavigateHome,
  onNavigatePage,
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

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-300"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{t('backToTool')}</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-medium">
          <button
            type="button"
            onClick={() => onNavigatePage('about')}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              page === 'about'
                ? 'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-semibold'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('navAbout')}
          </button>
          <button
            type="button"
            onClick={() => onNavigatePage('privacy')}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              page === 'privacy'
                ? 'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-semibold'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('navPrivacy')}
          </button>
        </div>
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
                <span>{t('navPrivacy')}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                {t('privacyTitle')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('effectiveDate')}
              </p>
            </div>

            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {t('privacyS1Title')}
                </h2>
                <p>{t('privacyS1Body')}</p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {t('privacyS2Title')}
                </h2>
                <p>{t('privacyS2Body')}</p>
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
                    className="text-sky-700 dark:text-sky-400 underline hover:text-sky-900 dark:hover:text-sky-300"
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
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                {t('termsTitle')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('effectiveDate')}
              </p>
            </div>

            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  1. Public Diagnostic Purpose
                </h2>
                <p>
                  dnslocator.online provides read-only lookups of publicly published DNS records. Information displayed here is provided &ldquo;as is&rdquo; without warranties of completeness or uptime. dnslocator.online is not affiliated with ICANN, domain registries, or registrars.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  2. Acceptable Use &amp; Rate Limits
                </h2>
                <p>
                  Automated scraping, high-frequency bot polling, or attempts to bypass per-IP rate limits (45 requests per minute) are prohibited. Users remain solely responsible for how they interpret or apply DNS diagnostics to their own domains and infrastructure.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  3. Limitation of Liability
                </h2>
                <p>
                  In no event shall dnslocator.online or its maintainers be liable for any indirect, incidental, or consequential damages arising from DNS misconfigurations, propagation delays, or service interruptions.
                </p>
              </section>
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
                Report a resolver issue, request a regional checkpoint, or ask a question about DNS diagnostics.
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
                    <option value="Privacy & Compliance">Privacy &amp; Compliance</option>
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
                  className="h-10 px-5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] dark:bg-sky-500 dark:hover:bg-sky-400 disabled:opacity-60 text-white dark:text-slate-950 text-sm font-semibold transition-colors"
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
