import { useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, Mail, ShieldCheck } from 'lucide-react';

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
      <button
        type="button"
        onClick={onNavigateHome}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Back to DNS Lookup Tool</span>
      </button>

      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
        {page === 'about' && (
          <>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                About dnslocator.online
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Independent Global DNS Propagation &amp; Record Diagnostic Tool
              </p>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed">
              <p>
                <strong className="text-slate-900">dnslocator.online</strong> is a free, lightweight Node.js web utility built for developers, system administrators, and website owners who need fast visibility into public DNS records and worldwide DNS propagation.
              </p>
              <p>
                In Global Propagation mode, our Node.js backend dispatches simultaneous queries across 18 geographically distributed DNS checkpoints—spanning North America, South America, Europe, Asia-Pacific, Oceania, and Africa—using public DNS over HTTPS (DoH) resolvers and regional EDNS Client Subnet (ECS) routing. In All Records mode, dnslocator.online queries <span className="font-mono text-slate-800">A, AAAA, CNAME, MX, TXT, NS, SOA, CAA</span>, and <span className="font-mono text-slate-800">_dmarc</span> records in parallel via Cloudflare&apos;s public 1.1.1.1 DoH JSON resolver.
              </p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <strong className="text-slate-900 block mb-1">Non-Affiliation Notice</strong>
                dnslocator.online displays publicly available DNS zone records only. We are not affiliated with, endorsed by, or connected to ICANN, IANA, Cloudflare, Google, or any domain name registrar.
              </div>
            </div>
          </>
        )}

        {page === 'privacy' && (
          <>
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700 mb-2">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                <span>Privacy Policy</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Privacy Policy
              </h1>
              <p className="text-xs text-slate-500 mt-1">Effective Date: November 2026</p>
            </div>

            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900">
                  1. DNS Query Transmission &amp; Third-Party Resolvers
                </h2>
                <p>
                  When you submit a domain name or IP address on dnslocator.online, the queried hostname is transmitted from our Node.js server to{' '}
                  <strong className="text-slate-900">
                    Cloudflare&apos;s public 1.1.1.1 DNS over HTTPS (DoH) resolver
                  </strong>{' '}
                  (<span className="font-mono">cloudflare-dns.com</span>) and, when using Global Propagation mode, to our configured regional public DNS resolvers (including Google Public DNS, AdGuard DNS, Control D, DNS.SB, IIJ Public DNS, TWNIC Quad101, and AliDNS) solely to retrieve public DNS records on your behalf.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900">
                  2. Rate Limiting &amp; Short-Lived Caching
                </h2>
                <p>
                  To protect our infrastructure from automated abuse, our server temporarily processes requester IP addresses in memory using a 60-second sliding-window rate limiter. IP addresses are not persisted to a database or sold to third parties. DNS responses are cached in memory for up to 5 minutes (or the record&apos;s TTL, whichever is shorter).
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900">
                  3. Browser Local Storage
                </h2>
                <p>
                  Your browser stores recent DNS lookup responses and recent query history locally in <span className="font-mono">localStorage</span> for 5 minutes to avoid redundant network requests. You may clear this cache at any time using the Clear Cache button in the top navigation bar.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900">
                  4. Contact Information &amp; Inquiries
                </h2>
                <p>
                  If you submit a message via our{' '}
                  <button
                    type="button"
                    onClick={() => onNavigatePage('contact')}
                    className="text-sky-700 underline hover:text-sky-900"
                  >
                    Contact page
                  </button>
                  , your name, email address, and message are used strictly to respond to your request.
                </p>
              </section>
            </div>
          </>
        )}

        {page === 'terms' && (
          <>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Terms of Service
              </h1>
              <p className="text-xs text-slate-500 mt-1">Effective Date: November 2026</p>
            </div>

            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900">
                  1. Public Diagnostic Purpose
                </h2>
                <p>
                  dnslocator.online provides read-only lookups of publicly published DNS records. Information displayed here is provided &ldquo;as is&rdquo; without warranties of completeness or uptime. dnslocator.online is not affiliated with ICANN, domain registries, or registrars.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900">
                  2. Acceptable Use &amp; Rate Limits
                </h2>
                <p>
                  Automated scraping, high-frequency bot polling, or attempts to bypass per-IP rate limits (45 requests per minute) are prohibited. Users remain solely responsible for how they interpret or apply DNS diagnostics to their own domains and infrastructure.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900">
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
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700 mb-2">
                <Mail className="w-4 h-4" aria-hidden="true" />
                <span>Contact Support</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Contact dnslocator.online
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Report a resolver issue, request a regional checkpoint, or ask a question about DNS diagnostics.
              </p>
            </div>

            {submitSuccess ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>Message Received</span>
                </div>
                <p className="text-sm text-emerald-800">
                  Thank you for reaching out. Your reference ID is{' '}
                  <span className="font-mono font-semibold">{submitSuccess.referenceId}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitSuccess(null)}
                  className="text-xs font-medium text-emerald-900 underline pt-1"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                {submitError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800"
                  >
                    {submitError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
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
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
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
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-subject"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Topic
                  </label>
                  <select
                    id="contact-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
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
                    className="w-full p-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
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
