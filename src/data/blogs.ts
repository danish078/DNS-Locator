import type { DnsRecordType } from '../types/dns';
import type { AuthorProfile } from './authors';

export interface BlogArticleSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  tip?: string;
  image?: {
    src: string;
    alt: string;
    caption: string;
  };
}

export interface BlogPost {
  slug: string;
  title: string;
  metaDescription: string;
  excerpt: string;
  category: string;
  authorId: AuthorProfile['id'];
  publishedAt: string;
  updatedAt: string;
  readTimeMinutes: number;
  shareImage: string;
  shareImageAlt: string;
  keywords: string[];
  suggestedDomain: string;
  suggestedRecordType: DnsRecordType;
  isPillarGuide?: boolean;
  relatedRecordSlugs: string[];
  sections: BlogArticleSection[];
}

/**
 * Removed off-topic / copied slugs that MUST return HTTP 410 Gone across
 * Express, Cloudflare Worker, and prerendered static error handling.
 */
export const GONE_BLOG_SLUGS: readonly string[] = [
  'mac-address-lookup-and-mac-oui-lookup-for-network-admins',
  'reverse-image-search-and-google-photo-lookup-for-brand-security',
  'morse-code-translator-to-dns-packets-signal-encoding-history',
  'hex-color-to-pantone-visual-qa-for-multi-region-dns-deployments',
  'complete-website-launch-toolkit-dns-ip-mac-signal-and-brand-checks',
];

export const GONE_BLOG_SLUG_SET = new Set<string>(GONE_BLOG_SLUGS);

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'complete-guide-to-dns-propagation',
    title: 'The Complete Guide to DNS Propagation: TTL, Caching & Global Verification',
    metaDescription:
      'Master DNS propagation from first principles. Learn how TTL, recursive resolvers, parent TLD caches, GeoDNS, and DNSSEC shape global update times.',
    excerpt:
      'Our definitive engineering guide explaining why DNS changes take time to converge worldwide, how recursive TTL caching actually works, and how to ship zero-downtime migrations.',
    category: 'DNS Propagation',
    authorId: 'tariq-mahmood',
    publishedAt: '2026-11-20',
    updatedAt: '2026-11-23',
    readTimeMinutes: 9,
    shareImage: '/images/blog-propagation-guide.jpg',
    shareImageAlt: 'Global DNS propagation wave rings synchronized across worldwide network nodes',
    keywords: [
      'dns propagation',
      'dns check',
      'ttl caching',
      'recursive resolver',
      'geodns',
      'dnssec migration',
    ],
    suggestedDomain: 'www.dnslocator.online',
    suggestedRecordType: 'A',
    isPillarGuide: true,
    relatedRecordSlugs: ['a-record-lookup', 'ns-lookup', 'mx-lookup', 'txt-spf-checker'],
    sections: [
      {
        heading: 'What Is DNS Propagation and Why Is It Never Instant?',
        paragraphs: [
          'Unlike editing a local file, updating a DNS record at your authoritative nameserver does not push notifications out across the internet. Instead, millions of recursive DNS resolvers operated by mobile carriers, broadband ISPs, corporate networks, and public resolvers such as 1.1.1.1 and 8.8.8.8 pull records on demand and store them locally.',
          'Each stored answer remains in cache until its Time to Live (TTL) counter reaches zero. Until an upstream resolver’s old TTL expires, visitors connected to that resolver continue receiving the previous IP address or mail server—creating the gradual convergence window known as DNS propagation.',
        ],
        image: {
          src: '/images/dns-resolution-diagram.jpg',
          alt: 'Four-stage recursive DNS resolution flow from client device through resolver, root, TLD, and authoritative nameserver',
          caption: 'How a recursive resolver walks from root hints to your authoritative nameserver when a cached TTL expires.',
        },
        bullets: [
          'Record edits inside the same authoritative host (A, AAAA, CNAME, MX, TXT) usually settle within 5 minutes to 4 hours.',
          'Nameserver delegation changes (NS updates at your registrar) often take 24–48 hours due to parent TLD registry TTLs.',
          'Negative caching (NXDOMAIN responses) is governed by the final field in your zone SOA record.',
        ],
      },
      {
        heading: 'How Long Does Each DNS Record Type Take to Propagate?',
        paragraphs: [
          'Propagation speed depends on two timers: the TTL published on the old record before you clicked save, and whether the change crosses from your zone file up to the parent registry.',
          'For example, when migrating web servers, engineers lower the A record TTL to 300 seconds a day in advance. Even if your old A record had a 24-hour TTL (86400s), waiting 24 hours after lowering it ensures every resolver worldwide holds only a 5-minute lease by launch window.',
        ],
        image: {
          src: '/images/dns-propagation-map.jpg',
          alt: 'World map showing 18 global DNS Anycast checkpoints propagating updated zone answers across continents',
          caption: 'Verifying convergence across North America, Europe, Asia-Pacific, South America, Oceania, and Africa simultaneously.',
        },
      },
      {
        heading: 'Why Different Checkpoints Sometimes Show Different IPs',
        paragraphs: [
          'Seeing Tokyo resolve one IPv4 address while Ashburn or London resolves another does not always mean propagation is broken. Content Delivery Networks and multi-region load balancers rely on Anycast and GeoDNS (paired with EDNS Client Subnet routing) to direct traffic to nearby regional Points of Presence.',
          'When auditing a migration in DNS Locator, use Expected Value Matching to paste your target origin IP or verify against the consensus cluster shown above the regional checkpoint table.',
        ],
        tip: 'Pre-flight rule: Disable DNSSEC DS signatures at your registrar before switching NS providers, or resolvers will return SERVFAIL instead of the new zone.',
      },
      {
        heading: 'Step-by-Step Zero-Downtime DNS Migration Playbook',
        paragraphs: [
          'Follow this repeatable sequence before moving a production web application or mail cluster so traffic shifts smoothly without lost requests or bounced emails.',
        ],
        bullets: [
          'T-24 Hours: Lower TTL on A, AAAA, CNAME, MX, and TXT records to 300 seconds and verify DNSSEC state.',
          'T-1 Hour: Provision identical TLS certificates, firewall rules, and SPF/DKIM keys on the destination server.',
          'Cutover: Update the target IP or hostname records and run a live check on DNS Locator across all 18 checkpoints.',
          'T+2 Hours: Confirm 100% regional consensus and restore production TTLs back to 3600 seconds.',
        ],
      },
    ],
  },
  {
    slug: 'how-to-run-a-global-dns-check-with-dns-locator',
    title: 'How to Run a Global DNS Check After Updating Your Domain Records',
    metaDescription:
      'Run a fast global DNS check with DNS Locator. Verify A records, IPv6 AAAA parity, MX propagation, and local ISP cache lag across 18 checkpoints.',
    excerpt:
      'Learn how to run a live global DNS check across 18 regional checkpoints with DNS Locator to confirm A, AAAA, MX, and TXT propagation without ISP cache lag.',
    category: 'DNS Propagation',
    authorId: 'tariq-mahmood',
    publishedAt: '2026-11-18',
    updatedAt: '2026-11-22',
    readTimeMinutes: 6,
    shareImage: '/images/dns-propagation-map.jpg',
    shareImageAlt: 'Global DNS Anycast propagation map across 18 DNS Locator checkpoints',
    keywords: [
      'dns check',
      'dns propagation',
      'ip address lookup',
      'ttl verification',
      'regional resolvers',
    ],
    suggestedDomain: 'www.dnslocator.online',
    suggestedRecordType: 'A',
    relatedRecordSlugs: ['a-record-lookup', 'aaaa-record-lookup', 'ns-lookup'],
    sections: [
      {
        heading: 'Why Every Migration Starts With a Multi-Region DNS Check',
        paragraphs: [
          'Whenever you point a domain such as www.dnslocator.online to a new server or cloud load balancer, querying only your local computer gives an incomplete picture. Your router and broadband carrier hold cached zone entries based on the previous Time to Live (TTL). Running a multi-region check as outlined in our Complete Guide to DNS Propagation shows exactly what recursive resolvers across North America, Europe, Asia-Pacific, and South America return right now.',
          'Each A or AAAA response returned during a lookup lets you confirm whether traffic is hitting your expected origin server IP or still routing to an older host.',
        ],
        bullets: [
          'Inspect A, AAAA, CNAME, MX, TXT, NS, SOA, and CAA records from a single DNS Locator workspace.',
          'Lower record TTL to 300 seconds 24 hours before switching servers so global checks converge faster.',
          'Paste your target IP into Expected Value Matching to highlight any lagging region.',
        ],
      },
      {
        heading: 'Interpreting Healthy Propagation vs. Stale ISP Caches',
        paragraphs: [
          'If all 18 public checkpoints report Propagated while your office workstation still loads the previous website, the domain itself has already propagated globally—only your local ISP or browser cache needs to refresh.',
          'Flush your workstation DNS resolver cache or switch temporarily to a public DNS over HTTPS resolver to confirm the updated site loads cleanly.',
        ],
        tip: 'Tip: Paste any full HTTPS URL into DNS Locator and it automatically extracts the clean hostname before running the 18-region lookup.',
      },
    ],
  },
  {
    slug: 'ip-address-lookup-and-ip-number-search-guide',
    title: 'IP Address Lookup & Hosting Audits: Tracing A and AAAA DNS Records',
    metaDescription:
      'Pair A and AAAA lookups with IP ownership and ASN verification to confirm whether domains point to your cloud origin, CDN edge, or legacy servers.',
    excerpt:
      'Connect DNS Locator A and AAAA zone responses with ASN verification, GeoDNS checks, and PTR reverse DNS audits to validate your hosting origins.',
    category: 'IP & Routing Diagnostics',
    authorId: 'tariq-mahmood',
    publishedAt: '2026-11-16',
    updatedAt: '2026-11-22',
    readTimeMinutes: 7,
    shareImage: '/images/blog-ip-asn-guide.jpg',
    shareImageAlt: 'Isometric server clusters and fiber routing paths illustrating IP address and ASN topology',
    keywords: [
      'ip address lookup',
      'a record lookup',
      'aaaa record',
      'asn routing',
      'geodns',
      'ptr reverse dns',
    ],
    suggestedDomain: 'www.dnslocator.online',
    suggestedRecordType: 'A',
    relatedRecordSlugs: ['a-record-lookup', 'aaaa-record-lookup', 'ptr-lookup'],
    sections: [
      {
        heading: 'Turning DNS A & AAAA Records Into Hosting Ownership Checks',
        paragraphs: [
          'Human-readable domain names exist solely as pointers to numeric IPv4 (A) and IPv6 (AAAA) addresses. When debugging outages or auditing legacy subdomains, inspecting those resolved IP addresses clarifies whether a service sits behind your CDN proxy, cloud load balancer, or an unpatched legacy server.',
          'Once DNS Locator surfaces the active IP addresses across 18 checkpoints, administrators verify Autonomous System Number (ASN) ownership and check reverse DNS (PTR) alignment—especially for mail relays.',
        ],
        bullets: [
          'Verify resolved IPv4 addresses match your active production load balancer.',
          'Check dual-stack IPv6 (AAAA) entries so mobile traffic never falls back to obsolete hosts.',
          'Pair outbound mail IPs with Forward-Confirmed Reverse DNS (PTR) lookups.',
        ],
      },
      {
        heading: 'Auditing GeoDNS & Anycast Responses Globally',
        paragraphs: [
          'Modern edge networks return distinct regional IP addresses depending on the resolver’s geographic region. Comparing DNS Locator responses in Tokyo, Frankfurt, São Paulo, and San Jose proves your GeoDNS rules steer users accurately. Review our Complete Guide to DNS Propagation for full detail on how EDNS Client Subnet influences regional answers.',
        ],
        tip: 'Use the Domain Comparison panel inside DNS Locator after searching to diff staging vs. production zones side-by-side.',
      },
    ],
  },
  {
    slug: 'what-is-my-isp-number-troubleshooting-local-dns-cache',
    title: 'Why Local ISP Resolvers Serve Stale DNS Records (And How to Fix Cache Lag)',
    metaDescription:
      'Understand why your home or office ISP continues serving old DNS entries after public resolvers show 100% propagation, and learn how to flush local caches.',
    excerpt:
      'Discover how carrier ASNs, broadband resolver overrides, and OS-level caches cause stale views after DNS updates—and how to isolate them fast.',
    category: 'IP & Routing Diagnostics',
    authorId: 'hannah-lindqvist',
    publishedAt: '2026-11-14',
    updatedAt: '2026-11-22',
    readTimeMinutes: 5,
    shareImage: '/images/blog-isp-cache-guide.jpg',
    shareImageAlt: 'Layered translucent recursive resolver caching planes showing TTL countdown timers',
    keywords: [
      'isp dns cache',
      'flush dns cache',
      'recursive resolver',
      'ttl override',
      'dns propagation lag',
    ],
    suggestedDomain: 'www.dnslocator.online',
    suggestedRecordType: 'NS',
    relatedRecordSlugs: ['ns-lookup', 'soa-lookup', 'a-record-lookup'],
    sections: [
      {
        heading: 'Why Your Office Sees the Old Site When DNS Locator Is Green',
        paragraphs: [
          'One of the most common migration surprises occurs when every public checkpoint on DNS Locator reports your new server IP, yet your office browser still loads the legacy maintenance page. The reason lies in multi-tier recursive caching inside consumer and enterprise broadband networks.',
          'Some ISP resolvers enforce minimum cache floors—holding DNS answers longer than the 60-second or 300-second TTL configured on your authoritative nameserver. Meanwhile, browsers and operating systems maintain their own short-lived DNS stubs.',
        ],
        bullets: [
          'Compare your local workstation result against neutral public resolvers (1.1.1.1, 8.8.8.8, Quad9) via DNS Locator.',
          'Flush local OS cache (`ipconfig /flushdns` on Windows, `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder` on macOS).',
          'Inspect NS and SOA records first to verify registrar delegation truly points to your active DNS host.',
        ],
      },
      {
        heading: 'Checking SOA Negative Caching After Subdomain Creation',
        paragraphs: [
          'If you visited a brand-new subdomain before creating its A or CNAME record, your local ISP cached an NXDOMAIN "does not exist" answer for the duration of the SOA minimum TTL field. Lowering SOA negative TTLs before launches prevents phantom 404 delays.',
        ],
      },
    ],
  },
  {
    slug: 'using-tracert-and-dns-check-to-diagnose-routing-delays',
    title: 'Separating DNS Resolution Failures From Network Routing & Firewall Timeouts',
    metaDescription:
      'Combine global DNS propagation checks with traceroute path analysis and TCP port verification to isolate whether website timeouts are DNS or network issues.',
    excerpt:
      'A practical troubleshooting workflow pairing multi-region DNS resolution checks with traceroute hop analysis and firewall port verification.',
    category: 'Network Diagnostics',
    authorId: 'tariq-mahmood',
    publishedAt: '2026-11-12',
    updatedAt: '2026-11-22',
    readTimeMinutes: 6,
    shareImage: '/images/blog-tracert-ports-guide.jpg',
    shareImageAlt: 'Multi-hop packet routing trajectory passing verified network firewall gates',
    keywords: [
      'traceroute',
      'tracert',
      'dns latency',
      'firewall ports',
      'network diagnostics',
      'servfail',
    ],
    suggestedDomain: 'www.dnslocator.online',
    suggestedRecordType: 'A',
    relatedRecordSlugs: ['a-record-lookup', 'aaaa-record-lookup', 'soa-lookup'],
    sections: [
      {
        heading: 'Step 1: Confirm Global Name Resolution First',
        paragraphs: [
          'When customers report intermittent timeouts, teams often guess blindly between DNS misconfiguration and server downtime. Start with a 18-region check on DNS Locator (following our Complete Guide to DNS Propagation) to confirm every continent resolves the hostname to a valid IP with low query latency.',
          'If resolvers return NXDOMAIN or SERVFAIL, fix your zone records or DNSSEC DS signature before touching application servers. If every region resolves cleanly, the issue sits downstream in IP routing, TLS, or firewall rules.',
        ],
        bullets: [
          'Use DNS Locator’s Global Health & Latency Distribution chart to inspect p50 and p95 lookup latency.',
          'Run `traceroute` (macOS/Linux) or `tracert` (Windows) toward the resolved IP to check for stalled transit hops.',
          'Verify TCP ports 80 and 443 (or 25/587 for mail) accept inbound connections on both IPv4 and IPv6.',
        ],
      },
      {
        heading: 'Step 2: Interpreting Asterisks and Mid-Path Latency Jumps',
        paragraphs: [
          'Edge firewalls frequently drop ICMP echo probes used by traceroute while continuing to serve HTTPS normally. Always confirm reachability with a direct TCP handshake or `curl -I https://yourdomain.com` before escalating transit tickets.',
        ],
      },
    ],
  },
  {
    slug: 'mx-spf-dmarc-and-dnssec-email-security-guide',
    title: 'Securing Email & Domain Zones With MX, SPF, DMARC, CAA, and DNSSEC',
    metaDescription:
      'Prevent spoofed emails and unauthorized TLS certificates. Audit MX priority, SPF lookup limits, DMARC alignment, CAA rules, and DNSSEC validation.',
    excerpt:
      'Protect outbound deliverability and domain trust using authenticated DNS records—from MX routing and SPF flattening to DMARC enforcement, CAA pinning, and DNSSEC.',
    category: 'DNS Security',
    authorId: 'hannah-lindqvist',
    publishedAt: '2026-11-09',
    updatedAt: '2026-11-23',
    readTimeMinutes: 8,
    shareImage: '/images/blog-security-guide.jpg',
    shareImageAlt: 'Cryptographic security shield securing email authentication and DNSSEC verification chains',
    keywords: [
      'mx lookup',
      'spf checker',
      'dmarc policy',
      'caa record',
      'dnssec validation',
      'email deliverability',
    ],
    suggestedDomain: 'google.com',
    suggestedRecordType: 'MX',
    relatedRecordSlugs: ['mx-lookup', 'txt-spf-checker', 'caa-lookup', 'ptr-lookup'],
    sections: [
      {
        heading: 'How MX, SPF, DKIM, and DMARC Work Together',
        paragraphs: [
          'Inbound mail delivery depends on accurately prioritized MX records, while inbox placement for outbound mail depends on TXT authentication records. Receiving mail servers evaluate SPF (which IPs may send for your domain), DKIM (cryptographic message signatures), and DMARC (alignment rules and enforcement policy).',
          'Running DNS Locator’s All Records lookup inspects MX, apex SPF (`v=spf1`), and `_dmarc` TXT entries in a single pass so missing or malformed records are immediately flagged.',
        ],
        bullets: [
          'Keep exactly one `v=spf1` TXT record on your root domain and stay under the 10-DNS-lookup limit.',
          'Publish `_dmarc` starting with `p=none` monitoring, then graduate to `p=quarantine` or `p=reject`.',
          'Confirm dedicated sending IPs pass Forward-Confirmed Reverse DNS (PTR) checks.',
        ],
      },
      {
        heading: 'Hardening TLS Issuance With CAA and DNSSEC',
        paragraphs: [
          'Beyond email, publish CAA records restricting which Certificate Authorities may sign TLS certificates for your domain, and enable DNSSEC so resolvers cryptographically verify every response via the Authenticated Data (AD) flag.',
          'Before changing authoritative nameservers, consult our Complete Guide to DNS Propagation so DNSSEC DS key rollovers never break global resolution.',
        ],
        tip: 'Quick audit: Search any domain in DNS Locator and check the Email Health badges (MX, SPF, DMARC) and DNSSEC Valid indicator at the top of the workspace.',
      },
    ],
  },
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function isGoneBlogSlug(slug: string): boolean {
  return GONE_BLOG_SLUG_SET.has(slug) || slug.startsWith('daily-');
}
