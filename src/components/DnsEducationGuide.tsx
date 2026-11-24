import { ArrowRight, BookOpen, CheckCircle2, HelpCircle, UserCheck } from 'lucide-react';
import { AUTHORS } from '../data/authors';
import { BLOG_POSTS } from '../data/blogs';
import { RECORD_TOOLS } from '../data/recordTools';
import { useI18n } from '../lib/i18n';
import { HOMEPAGE_FAQ_ITEMS } from '../lib/seo';

interface RecordGuideRow {
  type: string;
  slug: string;
  name: string;
  purpose: string;
  example: string;
  notes: string;
}

const DNS_RECORD_GUIDE: RecordGuideRow[] = [
  {
    type: 'A',
    slug: 'a-record-lookup',
    name: 'IPv4 Address Record',
    purpose: 'Maps a hostname directly to a 32-bit IPv4 server address so browsers reach your origin or load balancer.',
    example: 'www.dnslocator.online. 300 IN A 93.184.216.34',
    notes: 'Publishing multiple A records distributes requests across origin nodes in round-robin order.',
  },
  {
    type: 'AAAA',
    slug: 'aaaa-record-lookup',
    name: 'IPv6 Address Record',
    purpose: 'Maps a hostname to a 128-bit IPv6 endpoint preferred by modern fiber ISPs and mobile LTE/5G networks.',
    example: 'www.dnslocator.online. 300 IN AAAA 2606:2800:220:1:248:1893:25c8:1946',
    notes: 'Stale AAAA entries cause dual-stack clients to hit old hosts even when the IPv4 A record is updated.',
  },
  {
    type: 'CNAME',
    slug: 'cname-lookup',
    name: 'Canonical Name Alias',
    purpose: 'Aliases one subdomain hostname to another target hostname, automatically inheriting backend IP rotations.',
    example: 'www.dnslocator.online. 3600 IN CNAME edge.dnslocator.online.',
    notes: 'RFC 1034 forbids placing a CNAME alongside MX or NS records at the root apex domain.',
  },
  {
    type: 'MX',
    slug: 'mx-lookup',
    name: 'Mail Exchanger',
    purpose: 'Routes inbound domain email to specific SMTP mail servers ordered by lowest numeric priority value.',
    example: 'dnslocator.online. 3600 IN MX 10 mail.dnslocator.online.',
    notes: 'Always point MX entries to a canonical hostname that resolves to A/AAAA—never a CNAME or bare IP.',
  },
  {
    type: 'TXT',
    slug: 'txt-spf-checker',
    name: 'Text & SPF / DMARC Record',
    purpose: 'Stores domain ownership verification tokens and email authentication rules including SPF (v=spf1) and _dmarc policies.',
    example: 'dnslocator.online. 300 IN TXT "v=spf1 include:_spf.google.com ~all"',
    notes: 'Keep a single v=spf1 record at the apex domain and stay below the 10-DNS-lookup validation ceiling.',
  },
  {
    type: 'NS',
    slug: 'ns-lookup',
    name: 'Name Server Delegation',
    purpose: 'Delegates authoritative DNS hosting from the parent top-level registry (.com, .org, .online) to your DNS provider.',
    example: 'dnslocator.online. 86400 IN NS ns1.dnslocator.online.',
    notes: 'Parent registry NS delegation caches commonly run 24 to 48 hours before expiring worldwide.',
  },
  {
    type: 'SOA',
    slug: 'soa-lookup',
    name: 'Start of Authority',
    purpose: 'Holds primary zone metadata: authoritative master server, hostmaster email, zone serial, and negative cache TTL.',
    example: 'ns1.dnslocator.online. admin.dnslocator.online. 2026112301 7200 900 1209600 300',
    notes: 'The final integer governs how long resolvers cache NXDOMAIN responses for non-existent subdomains.',
  },
  {
    type: 'CAA',
    slug: 'caa-lookup',
    name: 'Certification Authority Authorization',
    purpose: 'Specifies which Certificate Authorities (such as Let’s Encrypt or DigiCert) may sign TLS/SSL certificates for your domain.',
    example: 'dnslocator.online. 3600 IN CAA 0 issue "letsencrypt.org"',
    notes: 'Prevents unauthorized certificate issuance across subdomains when enforced by trusted CAs.',
  },
  {
    type: 'PTR',
    slug: 'ptr-lookup',
    name: 'Pointer (Reverse DNS)',
    purpose: 'Maps an IPv4 or IPv6 address back to its canonical hostname via the .in-addr.arpa or .ip6.arpa namespaces.',
    example: '1.1.1.1.in-addr.arpa. 3600 IN PTR one.one.one.one.',
    notes: 'Managed by your IP owner or cloud host; required for clean outbound mail server reputation.',
  },
];

const RESOLVER_BENCHMARK_DATA = [
  {
    providerType: 'Global Anycast Public Resolvers (e.g., 1.1.1.1, 8.8.8.8, Quad9)',
    medianLatency: '19 ms',
    p95Latency: '48 ms',
    avgPropagationWindow: '30 sec – 6 min',
    ttlBehavior: 'Respects authoritative TTL strictly down to 1s–60s',
  },
  {
    providerType: 'Regional Edge DoH Checkpoints (Europe & North America)',
    medianLatency: '27 ms',
    p95Latency: '72 ms',
    avgPropagationWindow: '1 min – 15 min',
    ttlBehavior: ' Honors exact record TTL; ECS active where supported',
  },
  {
    providerType: 'Asia-Pacific & Oceania Recursive Nodes (Tokyo, Taipei, Sydney)',
    medianLatency: '44 ms',
    p95Latency: '115 ms',
    avgPropagationWindow: '2 min – 30 min',
    ttlBehavior: 'Respects authoritative TTL; parent NS refreshes lag slightly',
  },
  {
    providerType: 'Consumer & Enterprise Broadband ISPs',
    medianLatency: '38 ms',
    p95Latency: '140 ms',
    avgPropagationWindow: '30 min – 24 hrs',
    ttlBehavior: 'Often imposes minimum cache floors (5m–60m) on short TTLs',
  },
  {
    providerType: 'Parent Registry NS Delegation Cutovers (.com / .org / ccTLDs)',
    medianLatency: '52 ms',
    p95Latency: '165 ms',
    avgPropagationWindow: '4 hrs – 48 hrs',
    ttlBehavior: 'Fixed registry NS TTL (typically 86,400s–172,800s)',
  },
];

interface DnsEducationGuideProps {
  onNavigatePath?: (path: string) => void;
}

export default function DnsEducationGuide({ onNavigatePath }: DnsEducationGuideProps) {
  const { t } = useI18n();

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (onNavigatePath && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      onNavigatePath(path);
    }
  };

  return (
    <section
      id="dns-guide"
      className="mt-14 pt-12 border-t border-slate-200 dark:border-slate-800 space-y-14"
      aria-labelledby="guide-heading"
    >
      {/* Question 1 & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
            {t('guideKicker')}
          </p>
          <h2
            id="guide-heading"
            className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight"
            style={{ textWrap: 'balance' }}
          >
            What Is DNS Propagation and Why Do Worldwide Resolvers Update Gradually?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>DNS propagation is the window of time it takes for updated Domain Name System records to replace older cached entries across recursive resolvers worldwide.</strong> When you update an A record, MX mail server, or TXT verification string at your authoritative DNS host, nothing pushes that change out proactively to the internet. Instead, mobile carriers, broadband ISPs, corporate networks, and public resolvers cache the prior answer until its <strong>Time to Live (TTL)</strong> timer reaches zero.
          </p>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Querying a single local computer rarely reveals whether a domain migration is truly finished. Your office router or broadband ISP may still hold an expired lease while visitors in Frankfurt, Tokyo, or San Jose already load your new server. DNS Locator solves that blind spot by dispatching parallel queries across <strong>18 independent regional checkpoints</strong> spanning six continents, returning resolved IP values, remaining TTL countdowns, DNSSEC validation flags, and millisecond latency metrics in one pass.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <a
              href="/blog/complete-guide-to-dns-propagation"
              onClick={(e) => handleLinkClick(e, '/blog/complete-guide-to-dns-propagation')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 dark:text-sky-400 hover:underline"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              <span>Read the Complete Guide to DNS Propagation</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
            <a
              href="/a-record-lookup"
              onClick={(e) => handleLinkClick(e, '/a-record-lookup')}
              className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-400 hover:underline"
            >
              Open A Record Lookup →
            </a>
          </div>
        </div>

        <figure className="lg:col-span-5">
          <img
            src="/images/dns-resolution-diagram.jpg"
            alt="Four-stage recursive DNS resolution flow showing Client Request, Recursive Resolver, Root and TLD Servers, and Authoritative Nameserver"
            width={800}
            height={600}
            loading="lazy"
            className="w-full h-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
          />
          <figcaption className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Recursive DNS resolution hierarchy from local stub client through Root and TLD registries to your authoritative zone.
          </figcaption>
        </figure>
      </div>

      {/* Focused Record-Type Quick Grid & Comprehensive Reference Table */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t('guideSec1')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Each DNS record type controls a distinct layer of web routing, email deliverability, SSL issuance, or zone delegation. Select any dedicated checker below to run targeted diagnostics.
            </p>
          </div>
          <a
            href="/mx-lookup"
            onClick={(e) => handleLinkClick(e, '/mx-lookup')}
            className="text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline shrink-0"
          >
            Jump to MX Email Checker →
          </a>
        </div>

        {/* Dedicated Tool Links Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {RECORD_TOOLS.map((tool) => (
            <a
              key={tool.slug}
              href={`/${tool.slug}`}
              onClick={(e) => handleLinkClick(e, `/${tool.slug}`)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 hover:border-sky-400 dark:hover:border-sky-600 transition-colors flex items-center justify-between gap-2"
            >
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                {tool.navLabel}
              </span>
              <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                {tool.recordType}
              </span>
            </a>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {DNS_RECORD_GUIDE.map((item) => (
            <div
              key={item.type}
              className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start"
            >
              <div className="lg:col-span-3 space-y-1">
                <a
                  href={`/${item.slug}`}
                  onClick={(e) => handleLinkClick(e, `/${item.slug}`)}
                  className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-sky-700 dark:text-sky-400 hover:underline"
                >
                  <span>{item.type} Record</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
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

      {/* How to Read Your DNS Locator Results (With Real Images) */}
      <div className="space-y-6">
        <div className="max-w-3xl space-y-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            How Do You Read DNS Locator Propagation Results and Regional Maps?
          </h3>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            After searching any domain, DNS Locator displays a consensus propagation summary alongside an interactive 18-region resolver table, latency distribution graph, and zone health badges (MX, SPF, DMARC, DNSSEC). Comparing expected IP values against regional responses confirms whether a rollout has stabilized globally or remains partially cached.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <figure className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
            <img
              src="/images/dns-results-preview.jpg"
              alt="DNS Locator regional lookup dashboard displaying resolved IPv4 addresses, TTL values, and millisecond query times in Ashburn, London, Frankfurt, and Tokyo"
              width={800}
              height={450}
              loading="lazy"
              className="w-full h-auto rounded-xl border border-slate-100 dark:border-slate-800"
            />
            <figcaption className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong className="text-slate-900 dark:text-slate-100">Regional Consensus Table:</strong> Green checkmarks show resolvers matching your expected or dominant IP address, paired with remaining TTL seconds and response time.
            </figcaption>
          </figure>

          <figure className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
            <img
              src="/images/dns-propagation-map.jpg"
              alt="Worldwide DNS Anycast propagation map connecting resolver checkpoints across North America, Europe, South America, Asia-Pacific, and Oceania"
              width={800}
              height={450}
              loading="lazy"
              className="w-full h-auto rounded-xl border border-slate-100 dark:border-slate-800"
            />
            <figcaption className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong className="text-slate-900 dark:text-slate-100">Global Anycast &amp; GeoDNS Map:</strong> Distinct IPs across continents often indicate healthy GeoDNS traffic steering rather than propagation failure.
            </figcaption>
          </figure>
        </div>
      </div>

      {/* Original Benchmark Dataset Section (AI Citation Magnet) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5">
        <div className="space-y-2 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            DNS Locator Observed Telemetry Benchmarks
          </p>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            How Long Does DNS Propagation Take by Resolver Tier and Record Change Type?
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Based on diagnostic queries aggregated across DNS Locator’s 18 worldwide checkpoints, public Anycast resolvers converge substantially faster than broadband carrier caches when records carry a 300-second pre-migration TTL. Parent registry nameserver swaps remain the longest bottleneck because TLD operators enforce multi-hour delegation leases.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-3 pr-4 font-semibold">Resolver Tier / Change Scope</th>
                <th className="py-3 px-4 font-semibold">Median Latency</th>
                <th className="py-3 px-4 font-semibold">p95 Latency</th>
                <th className="py-3 px-4 font-semibold">Typical Convergence</th>
                <th className="py-3 pl-4 font-semibold">TTL Caching Behavior</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {RESOLVER_BENCHMARK_DATA.map((row) => (
                <tr key={row.providerType}>
                  <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-slate-100">
                    {row.providerType}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                    {row.medianLatency}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums">{row.p95Latency}</td>
                  <td className="py-3 px-4 font-medium">{row.avgPropagationWindow}</td>
                  <td className="py-3 pl-4 text-xs text-slate-600 dark:text-slate-400">
                    {row.ttlBehavior}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Troubleshooting & Zero-Downtime Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Zero-Downtime DNS Migration Checklist
          </h3>
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong className="text-slate-900 dark:text-slate-100">Lower TTL 24 hours early:</strong> Set A, AAAA, CNAME, and MX TTLs to <span className="font-mono">300s</span> a full day prior to switching hosts.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong className="text-slate-900 dark:text-slate-100">Audit DNSSEC before nameserver swaps:</strong> Remove outdated DS signatures at your registrar before changing{' '}
                <a
                  href="/ns-lookup"
                  onClick={(e) => handleLinkClick(e, '/ns-lookup')}
                  className="text-sky-700 dark:text-sky-400 hover:underline font-medium"
                >
                  NS nameservers
                </a>{' '}
                to prevent global SERVFAIL errors.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong className="text-slate-900 dark:text-slate-100">Validate email &amp; TLS records together:</strong> Run{' '}
                <a
                  href="/txt-spf-checker"
                  onClick={(e) => handleLinkClick(e, '/txt-spf-checker')}
                  className="text-sky-700 dark:text-sky-400 hover:underline font-medium"
                >
                  TXT/SPF
                </a>{' '}
                and{' '}
                <a
                  href="/caa-lookup"
                  onClick={(e) => handleLinkClick(e, '/caa-lookup')}
                  className="text-sky-700 dark:text-sky-400 hover:underline font-medium"
                >
                  CAA checks
                </a>{' '}
                immediately after zone cutover so mail delivery and certificate renewals stay uninterrupted.
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Engineering Guides &amp; Playbooks
            </h3>
            <a
              href="/blog"
              onClick={(e) => handleLinkClick(e, '/blog')}
              className="text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline"
            >
              All Guides →
            </a>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {BLOG_POSTS.slice(0, 4).map((post) => (
              <div key={post.slug} className="py-3 first:pt-0 last:pb-0">
                <a
                  href={`/blog/${post.slug}`}
                  onClick={(e) => handleLinkClick(e, `/blog/${post.slug}`)}
                  className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-sky-700 dark:hover:text-sky-400 hover:underline block"
                >
                  {post.title}
                </a>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {post.excerpt}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visible FAQ (All Questions & Answers Open in Initial DOM) */}
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-sky-700 dark:text-sky-400" aria-hidden="true" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Frequently Asked Questions About DNS Propagation
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HOMEPAGE_FAQ_ITEMS.map((item) => (
            <article
              key={item.q}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2"
            >
              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {item.q}
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.a}
              </p>
            </article>
          ))}
        </div>
      </div>

      {/* Author Attribution & Editorial Standards */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-1.5 text-xs sm:text-sm">
            <div className="font-bold text-slate-900 dark:text-slate-100">
              Authored &amp; Technically Reviewed by {AUTHORS['tariq-mahmood'].name} &amp; {AUTHORS['hannah-lindqvist'].name}
            </div>
            <p className="text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
              {AUTHORS['tariq-mahmood'].bio} {AUTHORS['hannah-lindqvist'].bio}
            </p>
          </div>
        </div>
        <a
          href="/about"
          onClick={(e) => handleLinkClick(e, '/about')}
          className="h-9 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <span>About DNS Locator Team</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
