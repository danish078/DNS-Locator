import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface RecordGuideItem {
  type: string;
  name: string;
  purpose: string;
  example: string;
  notes: string;
}

const DNS_RECORD_GUIDE: RecordGuideItem[] = [
  {
    type: 'A',
    name: 'Address Record (IPv4)',
    purpose: 'Maps a hostname such as example.com or app.example.com directly to a 32-bit IPv4 server address.',
    example: 'example.com. 300 IN A 93.184.216.34',
    notes: 'Multiple A records on the same host create simple round-robin load distribution.',
  },
  {
    type: 'AAAA',
    name: 'IPv6 Address Record',
    purpose: 'Maps a hostname to a 128-bit IPv6 address for modern dual-stack networks and mobile carriers.',
    example: 'example.com. 300 IN AAAA 2606:2800:220:1:248:1893:25c8:1946',
    notes: 'If AAAA points to an old server while A points to a new one, IPv6 visitors will reach the wrong host.',
  },
  {
    type: 'CNAME',
    name: 'Canonical Name Alias',
    purpose: 'Aliases one subdomain to another hostname so IP updates at the target automatically carry over.',
    example: 'www.example.com. 3600 IN CNAME example.com.',
    notes: 'RFC rules forbid placing a CNAME alongside MX or NS records at the root apex domain.',
  },
  {
    type: 'MX',
    name: 'Mail Exchanger',
    purpose: 'Directs inbound email for a domain to specific mail servers ordered by numeric priority.',
    example: 'example.com. 3600 IN MX 10 mail.example.com.',
    notes: 'Lower priority integers (e.g., 10 before 20) are tried first by sending mail transfer agents.',
  },
  {
    type: 'TXT',
    name: 'Text Record',
    purpose: 'Holds arbitrary verification strings and email authentication policies including SPF, DKIM, and DMARC.',
    example: 'example.com. 300 IN TXT "v=spf1 include:_spf.google.com ~all"',
    notes: 'SPF records must stay under 10 DNS lookups to prevent validation failures at receiving mail servers.',
  },
  {
    type: 'NS',
    name: 'Name Server Delegation',
    purpose: 'Identifies the authoritative DNS providers responsible for answering queries about the domain zone.',
    example: 'example.com. 86400 IN NS ns1.example-dns.net.',
    notes: 'NS updates typically carry 24–48 hour TTLs at the parent registry (.com, .org, .online).',
  },
  {
    type: 'SOA',
    name: 'Start of Authority',
    purpose: 'Stores administrative metadata for the zone: primary nameserver, hostmaster contact, serial, and negative cache TTL.',
    example: 'ns1.example.com. admin.example.com. 2026112001 7200 900 1209600 300',
    notes: 'Incrementing the serial number signals secondary nameservers to pull updated zone records.',
  },
  {
    type: 'CAA',
    name: 'Certification Authority Authorization',
    purpose: 'Restricts which Certificate Authorities (CAs) are permitted to issue TLS/SSL certificates for the domain.',
    example: 'example.com. 3600 IN CAA 0 issue "letsencrypt.org"',
    notes: 'Helps prevent unauthorized SSL certificate issuance across subdomains.',
  },
  {
    type: 'PTR',
    name: 'Pointer (Reverse DNS)',
    purpose: 'Maps an IPv4 or IPv6 address back to a canonical hostname via the .in-addr.arpa namespace.',
    example: '1.1.1.1.in-addr.arpa. 3600 IN PTR one.one.one.one.',
    notes: 'Essential for outbound mail server reputation; managed by your IP network owner or cloud provider.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'How long does global DNS propagation actually take?',
    a: 'Most recursive resolvers pick up changes within minutes up to 4 hours, governed by the previous record’s Time to Live (TTL). Full global convergence across every ISP cache can take 24 to 48 hours, especially after changing NS nameservers at your registrar.',
  },
  {
    q: 'Why do different regions return different IP addresses for the same domain?',
    a: 'Two reasons: first, a recent DNS change may still be cached in some regions while other regions have already refreshed; second, large platforms and CDNs intentionally use GeoDNS or Anycast routing to send visitors in Tokyo, Frankfurt, or Ashburn to the closest regional edge server.',
  },
  {
    q: 'What should I do before migrating a website to minimize downtime?',
    a: 'Lower the TTL on your existing A, AAAA, CNAME, and MX records to 300 seconds (5 minutes) at least 24 hours before the cutover. Once propagation completes, verify all regions on dnslocator.online before raising the TTL back to 3600 seconds.',
  },
  {
    q: 'Why are my emails bouncing or landing in spam even though MX records exist?',
    a: 'Inbound mail relies on MX records, while outbound deliverability depends on matching TXT records for SPF (v=spf1), DKIM selector keys, and a _dmarc policy. Use the All Records view above to confirm MX, SPF, and _dmarc are all present and properly formatted.',
  },
  {
    q: 'Is dnslocator.online affiliated with ICANN or any domain registrar?',
    a: 'No. dnslocator.online is an independent public diagnostic utility. It queries publicly available DNS records via public DNS over HTTPS and regional resolvers and is not affiliated with ICANN, IANA, or domain registrars.',
  },
];

export default function DnsEducationGuide() {
  const { t } = useI18n();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section
      id="dns-guide"
      className="mt-16 pt-12 border-t border-slate-200 dark:border-slate-800 space-y-14"
      aria-labelledby="guide-heading"
    >
      {/* Intro */}
      <div className="max-w-3xl">
        <p className="text-xs font-semibold tracking-wide text-sky-700 dark:text-sky-400">
          {t('guideKicker')}
        </p>
        <h2
          id="guide-heading"
          className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2 tracking-tight"
          style={{ textWrap: 'balance' }}
        >
          {t('guideHeading')}
        </h2>
        <p className="text-base text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
          {t('guideIntro')}
        </p>
      </div>

      {/* Section 1: DNS Record Types */}
      <div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {t('guideSec1')}
        </h3>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {DNS_RECORD_GUIDE.map((item) => (
            <div
              key={item.type}
              className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start"
            >
              <div className="lg:col-span-3">
                <span className="font-mono text-sm font-semibold text-sky-700 dark:text-sky-400">
                  {item.type}
                </span>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {item.name}
                </div>
              </div>
              <div className="lg:col-span-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>{item.purpose}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{item.notes}</p>
              </div>
              <div className="lg:col-span-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/70 px-3 py-2 font-mono text-xs text-slate-800 dark:text-slate-200 break-all">
                  {item.example}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Propagation & Troubleshooting */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t('guideSec2')}
          </h3>
          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-3 leading-relaxed">
            <p>
              When a browser or mail server requests <span className="font-mono text-slate-800 dark:text-slate-200">example.com</span>, it asks a recursive resolver (such as 1.1.1.1, Google 8.8.8.8, Quad9 9.9.9.9, or an ISP resolver). If the answer is absent from cache, the resolver walks the hierarchy from the root servers to the TLD registry and finally to your authoritative nameservers.
            </p>
            <p>
              Every returned record carries a <strong className="font-semibold text-slate-900 dark:text-slate-100">TTL (Time to Live)</strong> in seconds. A TTL of <span className="font-mono text-slate-800 dark:text-slate-200">3600</span> tells resolvers worldwide to reuse the cached response for one full hour before checking your authoritative server again. Lowering TTL to <span className="font-mono text-slate-800 dark:text-slate-200">300</span> prior to a migration dramatically shortens cutover lag.
            </p>
            <p>
              When checking global regions, seeing two different IP addresses across continents does not automatically mean an error. Modern CDNs and cloud load balancers use <strong className="font-semibold text-slate-900 dark:text-slate-100">GeoDNS</strong> and <strong className="font-semibold text-slate-900 dark:text-slate-100">EDNS Client Subnet (ECS)</strong> to direct North American, European, and Asia-Pacific traffic to nearby points of presence.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t('guideSec3')}
          </h3>
          <dl className="space-y-3.5 text-sm">
            <div>
              <dt className="font-semibold text-slate-900 dark:text-slate-100">
                NXDOMAIN (Non-Existent Domain)
              </dt>
              <dd className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                The authoritative nameserver reports no records for that hostname. Verify the subdomain spelling, check whether your registrar domain has expired, and confirm NS delegation matches your active DNS host.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900 dark:text-slate-100">
                SERVFAIL or Regional Timeouts
              </dt>
              <dd className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                Often caused by broken DNSSEC DS signatures at the registrar after switching DNS providers, or unreachable authoritative nameservers. Disable stale DS records before moving NS delegation.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900 dark:text-slate-100">
                Email Delivery Rejections (SPF / DMARC Failures)
              </dt>
              <dd className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                Ensure only a single <span className="font-mono text-slate-800 dark:text-slate-200">v=spf1</span> TXT record exists at the apex domain, authorize every legitimate mail sender, and publish a <span className="font-mono text-slate-800 dark:text-slate-200">_dmarc</span> TXT record to pass strict inbox checks.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900 dark:text-slate-100">
                Apex Domain CNAME Conflicts
              </dt>
              <dd className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                Never combine a standard CNAME with MX or NS records on the root domain. Use ALIAS/ANAME flattening at your DNS provider or point the apex A/AAAA records directly to your edge IPs.
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Section 3: FAQ Accordion */}
      <div className="max-w-3xl">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {t('guideSec4')}
        </h3>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 transition-transform duration-150 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
