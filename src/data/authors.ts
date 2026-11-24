export interface AuthorProfile {
  id: 'tariq-mahmood' | 'hannah-lindqvist';
  name: string;
  role: string;
  bio: string;
  expertise: string[];
  sameAs: string[];
}

export const SITE_ORIGIN = 'https://dnslocator.online';

export const ORGANIZATION_INFO = {
  name: 'DNS Locator',
  legalName: 'DNS Locator Network Diagnostics',
  url: SITE_ORIGIN,
  logo: `${SITE_ORIGIN}/icon-512.png`,
  email: 'support@dnslocator.online',
  description:
    'Independent global DNS propagation, zone inspection, and resolver latency diagnostics utility verifying live public DNS records across 18 worldwide checkpoints.',
  sameAs: ['https://github.com/dnslocator'],
};

export const AUTHORS: Record<AuthorProfile['id'], AuthorProfile> = {
  'tariq-mahmood': {
    id: 'tariq-mahmood',
    name: 'Tariq Mahmood',
    role: 'Lead Network Reliability Engineer & Founder',
    bio: 'Tariq Mahmood is a network reliability engineer with over 10 years of experience managing global Anycast DNS zones, BGP routing telemetry, and zero-downtime cloud migrations.',
    expertise: ['DNS Propagation', 'Anycast Routing', 'BGP & Latency Telemetry', 'Zone Migrations'],
    sameAs: ['https://github.com/dnslocator'],
  },
  'hannah-lindqvist': {
    id: 'hannah-lindqvist',
    name: 'Hannah Lindqvist',
    role: 'Senior DNS & Email Deliverability Specialist',
    bio: 'Hannah Lindqvist specializes in DNSSEC chain-of-trust validation, enterprise email authentication (MX, SPF, DKIM, DMARC), CAA certificate pinning, and IPv6 dual-stack audits.',
    expertise: ['SPF & DMARC Security', 'DNSSEC Validation', 'CAA & TLS Policy', 'IPv6 Dual-Stack'],
    sameAs: ['https://github.com/dnslocator'],
  },
};

export function getAuthorById(id: AuthorProfile['id']): AuthorProfile {
  return AUTHORS[id];
}
