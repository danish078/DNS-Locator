import type { DnsRecordType } from '../types/dns';
import type { AuthorProfile } from './authors';

export interface RecordToolConfig {
  slug: string;
  recordType: DnsRecordType;
  navLabel: string;
  title: string;
  metaDescription: string;
  h1: string;
  lead: string;
  exampleDomain: string;
  authorId: AuthorProfile['id'];
  updatedAt: string;
  syntaxExample: string;
  whatItDoes: string[];
  whenToCheck: string[];
  commonMistakes: Array<{ issue: string; fix: string }>;
  cliCommand: string;
  relatedSlugs: string[];
}

export const RECORD_TOOLS: RecordToolConfig[] = [
  {
    slug: 'a-record-lookup',
    recordType: 'A',
    navLabel: 'A Record Lookup',
    title: 'A Record Lookup – Global IPv4 DNS Propagation Checker | DNS Locator',
    metaDescription:
      'Run a live A record lookup across 18 global regions. Verify IPv4 server addresses, TTL propagation, and Anycast CDN consistency on DNS Locator.',
    h1: 'A Record Lookup & Global IPv4 Propagation Checker',
    lead: 'Check which 32-bit IPv4 addresses your domain resolves to across 18 worldwide DNS checkpoints in real time.',
    exampleDomain: 'www.dnslocator.online',
    authorId: 'tariq-mahmood',
    updatedAt: '2026-11-22',
    syntaxExample: 'www.dnslocator.online.   300   IN   A   104.21.48.12',
    whatItDoes: [
      'An A (Address) record maps a human-readable domain or subdomain directly to a 32-bit IPv4 address such as 93.184.216.34. Whenever a visitor enters your domain in a browser, the recursive resolver fetches the A record first unless the client prefers IPv6 (AAAA).',
      'Publishing multiple A records for the same hostname enables basic DNS round-robin load balancing across multiple origin servers, while CDN and Anycast networks return the edge node IP closest to each DNS Locator regional checkpoint.',
    ],
    whenToCheck: [
      'Immediately after migrating your website to a new cloud server, VPS, or load balancer.',
      'When switching CDN providers or toggling reverse-proxy orange-cloud routing.',
      'If visitors in one country reach the new site while another region still loads the old host.',
    ],
    commonMistakes: [
      {
        issue: 'High legacy TTL slows cutover convergence',
        fix: 'Drop your A record TTL from 86400s to 300s at least 24 hours before changing the IPv4 value.',
      },
      {
        issue: 'Forgotten A record on the www or apex subdomain',
        fix: 'Always verify both the root apex domain and the www subdomain return valid IPs without broken redirects.',
      },
      {
        issue: 'Mismatched A and AAAA destinations',
        fix: 'Pair every A record update with an AAAA record check so dual-stack IPv6 visitors do not land on your decommissioned host.',
      },
    ],
    cliCommand: 'dig +short A www.dnslocator.online @1.1.1.1',
    relatedSlugs: ['aaaa-record-lookup', 'cname-lookup', 'ns-lookup'],
  },
  {
    slug: 'aaaa-record-lookup',
    recordType: 'AAAA',
    navLabel: 'AAAA Record Lookup',
    title: 'AAAA Record Lookup – Global IPv6 DNS Propagation Checker | DNS Locator',
    h1: 'AAAA Record Lookup & IPv6 DNS Propagation Tool',
    metaDescription:
      'Perform a free AAAA record lookup across 18 global regions. Validate 128-bit IPv6 connectivity, dual-stack parity, and TTL propagation.',
    lead: 'Verify 128-bit IPv6 addresses across North America, Europe, Asia-Pacific, and mobile carrier networks.',
    exampleDomain: 'www.google.com',
    authorId: 'hannah-lindqvist',
    updatedAt: '2026-11-22',
    syntaxExample: 'www.dnslocator.online.   300   IN   AAAA   2606:4700:3030::6815:300c',
    whatItDoes: [
      'The AAAA ("quad-A") record maps a domain name to a 128-bit IPv6 address—four times the address length of an IPv4 A record. Modern cellular networks and fiber ISPs prefer IPv6 via Happy Eyeballs whenever an AAAA record exists.',
      'Testing AAAA propagation separately from A records catches silent dual-stack splits where IPv4 visitors see a newly migrated server while IPv6 mobile users continue hitting stale infrastructure.',
    ],
    whenToCheck: [
      'Before enabling IPv6 listeners on a web server, reverse proxy, or Kubernetes ingress.',
      'During server migrations when only the IPv4 A record was updated in your DNS zone.',
      'To confirm CDN edge networks are advertising dual-stack endpoints globally.',
    ],
    commonMistakes: [
      {
        issue: 'Stale AAAA record left pointing to an old host',
        fix: 'If your new host does not yet support IPv6, delete the obsolete AAAA record rather than leaving a broken address active.',
      },
      {
        issue: 'Firewall allows port 443 on IPv4 but blocks IPv6',
        fix: 'Ensure security groups permit inbound TCP 80 and 443 on ::/0 as well as 0.0.0.0/0.',
      },
    ],
    cliCommand: 'dig +short AAAA www.dnslocator.online @8.8.8.8',
    relatedSlugs: ['a-record-lookup', 'cname-lookup', 'caa-lookup'],
  },
  {
    slug: 'mx-lookup',
    recordType: 'MX',
    navLabel: 'MX Lookup',
    title: 'MX Record Lookup – Mail Exchanger & Email Routing Checker | DNS Locator',
    metaDescription:
      'Run an instant MX lookup across 18 global checkpoints. Verify mail exchanger priorities, hostnames, and email deliverability readiness.',
    h1: 'MX Record Lookup & Mail Server Priority Checker',
    lead: 'Inspect Mail Exchanger hostnames, numeric priority ordering, and global DNS propagation for reliable email delivery.',
    exampleDomain: 'google.com',
    authorId: 'hannah-lindqvist',
    updatedAt: '2026-11-22',
    syntaxExample: 'dnslocator.online.   3600   IN   MX   10 mail.dnslocator.online.',
    whatItDoes: [
      'MX (Mail Exchanger) records tell external mail transfer agents which servers accept inbound SMTP email for your domain. Each MX entry includes a numeric preference value and a canonical hostname (never a raw IP address).',
      'Lower numeric priority values have higher precedence—for example, priority 10 is tried before priority 20 or 50, which act as backup mail gateways if the primary relay is unreachable.',
    ],
    whenToCheck: [
      'When onboarding Google Workspace, Microsoft 365, Fastmail, or a transactional relay.',
      'If inbound emails bounce with "Host not found" or route to an old hosting inbox.',
      'Whenever auditing email security alongside TXT (SPF and DMARC) records.',
    ],
    commonMistakes: [
      {
        issue: 'Pointing an MX record to an IP address or CNAME',
        fix: 'RFC 5321 requires MX targets to be hostnames that resolve directly to A or AAAA records, never CNAME aliases or bare IP addresses.',
      },
      {
        issue: 'Equal priority left on primary and legacy relays',
        fix: 'Remove old hosting MX records cleanly instead of leaving them at higher preference numbers where spammers can abuse them.',
      },
    ],
    cliCommand: 'dig +short MX dnslocator.online @1.1.1.1',
    relatedSlugs: ['txt-spf-checker', 'ptr-lookup', 'a-record-lookup'],
  },
  {
    slug: 'txt-spf-checker',
    recordType: 'TXT',
    navLabel: 'TXT / SPF Checker',
    title: 'TXT & SPF Record Checker – DMARC, DKIM & Domain Verification | DNS Locator',
    metaDescription:
      'Inspect live TXT records, v=spf1 sender policies, _dmarc records, and domain ownership verification tokens across 18 global DNS regions.',
    h1: 'TXT Record & SPF Policy Checker',
    lead: 'Verify SPF sender policies, site verification tokens, and email authentication TXT strings globally.',
    exampleDomain: 'dnslocator.online',
    authorId: 'hannah-lindqvist',
    updatedAt: '2026-11-22',
    syntaxExample: 'dnslocator.online.   300   IN   TXT   "v=spf1 include:_spf.example.com -all"',
    whatItDoes: [
      'TXT records store machine-readable text metadata inside your DNS zone. Their two most critical uses are verifying domain ownership (Google Search Console, Bing Webmaster Tools, TLS challenges) and enforcing email authentication via SPF (Sender Policy Framework), DKIM, and DMARC.',
      'Note that DMARC policies live on the _dmarc subdomain (e.g., _dmarc.yourdomain.com). Use DNS Locator’s All Records tab to inspect apex TXT and _dmarc simultaneously.',
    ],
    whenToCheck: [
      'When outbound emails fail Gmail or Outlook spam filters due to SPF PermError.',
      'During Search Console, Bing Webmaster, or SSL DNS-01 ownership validation.',
      'After adding a new newsletter platform, CRM, or helpdesk mailer.',
    ],
    commonMistakes: [
      {
        issue: 'Publishing two separate v=spf1 TXT records',
        fix: 'SPF permits only ONE v=spf1 record per domain. Merge multiple senders into a single string with include: mechanisms.',
      },
      {
        issue: 'Exceeding the 10-DNS-lookup SPF limit',
        fix: 'Nested include: statements count toward the 10-lookup ceiling; prune retired vendors or flatten static sending IPs.',
      },
    ],
    cliCommand: 'dig +short TXT dnslocator.online @1.1.1.1',
    relatedSlugs: ['mx-lookup', 'ptr-lookup', 'caa-lookup'],
  },
  {
    slug: 'cname-lookup',
    recordType: 'CNAME',
    navLabel: 'CNAME Lookup',
    title: 'CNAME Record Lookup – Canonical Name Alias Propagation | DNS Locator',
    metaDescription:
      'Verify CNAME canonical alias targets and global propagation across 18 DNS checkpoints. Troubleshoot SaaS custom domains and CDN routing.',
    h1: 'CNAME Record Lookup & Alias Verification Tool',
    lead: 'Trace canonical subdomain aliases across 18 worldwide resolvers and spot apex CNAME conflicts fast.',
    exampleDomain: 'www.github.com',
    authorId: 'tariq-mahmood',
    updatedAt: '2026-11-22',
    syntaxExample: 'www.example.com.   3600   IN   CNAME   edge.provider.net.',
    whatItDoes: [
      'A CNAME (Canonical Name) record aliases one subdomain hostname to another hostname. When a CDN or SaaS platform rotates edge IP addresses behind the scenes, your CNAME target automatically inherits those updates without manual DNS edits.',
      'RFC 1034 prohibits placing a CNAME alongside other records such as MX or NS on the same hostname—which is why root apex domains must use A/AAAA records or provider-level CNAME flattening instead.',
    ],
    whenToCheck: [
      'Connecting a custom subdomain like app. or www. to Cloudflare Workers, Vercel, Shopify, or GitHub Pages.',
      'Auditing DKIM CNAME delegation keys for email providers.',
      'Diagnosing "ERR_TOO_MANY_REDIRECTS" or broken custom domain SSL issuance.',
    ],
    commonMistakes: [
      {
        issue: 'Entering an IP address as a CNAME target',
        fix: 'CNAME values must always point to another domain hostname, never an IPv4 or IPv6 address.',
      },
      {
        issue: 'Double-appended domain suffix in DNS panel',
        fix: 'Some DNS dashboards automatically append your domain name; verify the lookup does not show www.example.com.example.com.',
      },
    ],
    cliCommand: 'dig +short CNAME www.github.com @1.1.1.1',
    relatedSlugs: ['a-record-lookup', 'aaaa-record-lookup', 'ns-lookup'],
  },
  {
    slug: 'ns-lookup',
    recordType: 'NS',
    navLabel: 'NS Lookup',
    title: 'NS Record Lookup – Authoritative Nameserver Checker | DNS Locator',
    metaDescription:
      'Check authoritative NS nameserver delegation across 18 global DNS checkpoints. Verify registrar nameserver cutovers and DNS host alignment.',
    h1: 'NS Record Lookup & Nameserver Delegation Checker',
    lead: 'Confirm which authoritative nameservers control your domain zone across global TLD caches and resolvers.',
    exampleDomain: 'dnslocator.online',
    authorId: 'tariq-mahmood',
    updatedAt: '2026-11-22',
    syntaxExample: 'dnslocator.online.   86400   IN   NS   ns1.dns-host.net.',
    whatItDoes: [
      'NS (Name Server) records delegate authority for your domain zone from the top-level registry (.com, .org, .online) to the specific authoritative DNS servers hosting your zone file.',
      'Because parent TLD registries frequently publish NS records with 24-hour or 48-hour TTLs, changing nameservers at your domain registrar usually takes longer to propagate globally than editing an A or TXT record inside an existing zone.',
    ],
    whenToCheck: [
      'When transferring DNS management from your domain registrar to Cloudflare, Route 53, or Google Cloud DNS.',
      'If DNS record edits in your control panel fail to appear in global lookups (indicating wrong authoritative NS delegation).',
      'To verify redundant secondary nameservers are delegated properly.',
    ],
    commonMistakes: [
      {
        issue: 'Editing records at an inactive DNS host',
        fix: 'Run an NS lookup first to verify which provider is truly authoritative before editing zone entries.',
      },
      {
        issue: 'Forgetting to disable DNSSEC before changing nameservers',
        fix: 'Remove old DS records at the registrar or copy matching keys before switching NS delegation, otherwise resolvers return SERVFAIL.',
      },
    ],
    cliCommand: 'dig +short NS dnslocator.online @1.1.1.1',
    relatedSlugs: ['soa-lookup', 'a-record-lookup', 'cname-lookup'],
  },
  {
    slug: 'soa-lookup',
    recordType: 'SOA',
    navLabel: 'SOA Lookup',
    title: 'SOA Record Lookup – Start of Authority & Zone Serial Checker | DNS Locator',
    metaDescription:
      'Inspect SOA Start of Authority records globally. Check primary nameservers, hostmaster contact, zone serial numbers, and negative cache TTL.',
    h1: 'SOA Record Lookup & Zone Serial Inspector',
    lead: 'Verify Start of Authority metadata, serial synchronization across primary and secondary servers, and negative cache timers.',
    exampleDomain: 'dnslocator.online',
    authorId: 'tariq-mahmood',
    updatedAt: '2026-11-22',
    syntaxExample: 'ns1.example.net. hostmaster.example.net. 2026112201 7200 900 1209600 300',
    whatItDoes: [
      'Every valid DNS zone must contain one SOA (Start of Authority) record at the zone apex. It stores seven critical fields: Primary Master Nameserver (MNAME), Administrator Email (RNAME), Zone Serial Number, Refresh, Retry, Expire, and Minimum/Negative Cache TTL.',
      'Secondary nameservers watch the SOA Serial number (commonly formatted YYYYMMDDnn) to detect when zone transfers (AXFR/IXFR) are needed, while resolvers use the final integer to decide how long to cache NXDOMAIN responses.',
    ],
    whenToCheck: [
      'When secondary nameservers serve outdated zone answers compared to the primary server.',
      'To understand why an accidentally mistyped subdomain stays cached as NXDOMAIN across ISPs.',
    ],
    commonMistakes: [
      {
        issue: 'Editing a self-hosted BIND zone without incrementing the SOA serial',
        fix: 'Always increment the serial number after every manual zone edit so secondary nameservers pull the changes.',
      },
      {
        issue: 'Overly aggressive negative cache TTL',
        fix: 'Keep the final SOA minimum TTL field around 300–900 seconds so accidental NXDOMAIN glitches clear quickly.',
      },
    ],
    cliCommand: 'dig +short SOA dnslocator.online @1.1.1.1',
    relatedSlugs: ['ns-lookup', 'a-record-lookup', 'txt-spf-checker'],
  },
  {
    slug: 'caa-lookup',
    recordType: 'CAA',
    navLabel: 'CAA Lookup',
    title: 'CAA Record Lookup – SSL/TLS Certificate Authority Checker | DNS Locator',
    metaDescription:
      'Check Certification Authority Authorization (CAA) DNS records across 18 global regions to prevent unauthorized SSL/TLS certificate issuance.',
    h1: 'CAA Record Lookup & Certificate Authority Policy Checker',
    lead: 'Verify which Certificate Authorities are authorized to issue SSL/TLS certificates for your domain and subdomains.',
    exampleDomain: 'google.com',
    authorId: 'hannah-lindqvist',
    updatedAt: '2026-11-22',
    syntaxExample: 'dnslocator.online.   3600   IN   CAA   0 issue "letsencrypt.org"',
    whatItDoes: [
      'A CAA (Certification Authority Authorization) record explicitly lists which public Certificate Authorities—such as Let’s Encrypt, DigiCert, Google Trust Services, or Sectigo—are permitted to issue TLS certificates for your domain.',
      'By RFC 8659, every publicly trusted CA must check your CAA record before signing a certificate. Adding `issuewild` rules gives separate control over wildcard (`*.domain.com`) certificates, and `iodef` specifies an incident reporting address.',
    ],
    whenToCheck: [
      'When automated Let’s Encrypt or cloud ACM certificate renewals fail with "CAA record forbids issuance".',
      'During security compliance audits to lock down domain TLS issuance.',
    ],
    commonMistakes: [
      {
        issue: 'Missing secondary CA used by CDN or cloud load balancer',
        fix: 'Include all CAs used across your edge CDN (e.g., pki.goog, digicert.com, letsencrypt.org) to avoid renewal outages.',
      },
    ],
    cliCommand: 'dig +short CAA google.com @1.1.1.1',
    relatedSlugs: ['txt-spf-checker', 'aaaa-record-lookup', 'a-record-lookup'],
  },
  {
    slug: 'ptr-lookup',
    recordType: 'PTR',
    navLabel: 'PTR Lookup',
    title: 'PTR Record Lookup – Reverse DNS & IP Hostname Checker | DNS Locator',
    metaDescription:
      'Run a reverse DNS PTR lookup for any IPv4 address or .in-addr.arpa hostname across 18 global DNS checkpoints to audit mail server reputation.',
    h1: 'PTR Record Lookup & Reverse DNS (rDNS) Checker',
    lead: 'Enter an IPv4 address or .in-addr.arpa hostname to verify reverse DNS hostname alignment across 18 checkpoints.',
    exampleDomain: '1.1.1.1',
    authorId: 'hannah-lindqvist',
    updatedAt: '2026-11-22',
    syntaxExample: '1.1.1.1.in-addr.arpa.   3600   IN   PTR   one.one.one.one.',
    whatItDoes: [
      'A PTR (Pointer) record performs Reverse DNS (rDNS), translating an IPv4 or IPv6 address back into a canonical hostname under the special `.in-addr.arpa` or `.ip6.arpa` namespaces.',
      'Unlike forward A records hosted at your registrar, PTR records are always delegated to the network provider or cloud vendor that owns the IP address block.',
    ],
    whenToCheck: [
      'Before sending outbound email from a dedicated SMTP IP—major inbox providers reject mail without valid Forward-Confirmed Reverse DNS (FCrDNS).',
      'To verify cloud VPS hostname matching for security logging and audit trails.',
    ],
    commonMistakes: [
      {
        issue: 'Adding a PTR record inside your forward domain DNS panel',
        fix: 'PTR records must be configured inside your cloud provider or ISP IP management console, not your domain zone file.',
      },
      {
        issue: 'Forward A record does not match PTR hostname',
        fix: 'Ensure the hostname returned by your PTR record resolves forward via an A record back to the exact same IP.',
      },
    ],
    cliCommand: 'dig +short -x 1.1.1.1 @1.1.1.1',
    relatedSlugs: ['mx-lookup', 'a-record-lookup', 'txt-spf-checker'],
  },
];

export const RECORD_TOOL_BY_SLUG = new Map<string, RecordToolConfig>(
  RECORD_TOOLS.map((tool) => [tool.slug, tool])
);

export function getRecordToolBySlug(slug: string): RecordToolConfig | undefined {
  return RECORD_TOOL_BY_SLUG.get(slug.toLowerCase());
}

export function getRecordToolByType(type: DnsRecordType): RecordToolConfig | undefined {
  return RECORD_TOOLS.find((t) => t.recordType === type);
}
