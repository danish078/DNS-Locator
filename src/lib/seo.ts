import { ORGANIZATION_INFO, SITE_ORIGIN, getAuthorById } from '../data/authors.ts';
import { BLOG_POSTS, getBlogPostBySlug, isGoneBlogSlug, type BlogPost } from '../data/blogs.ts';
import { RECORD_TOOLS, getRecordToolBySlug, type RecordToolConfig } from '../data/recordTools.ts';
import type { LegalPageRoute } from '../components/LegalPages.tsx';

export type AppRoute =
  | 'home'
  | LegalPageRoute
  | 'news'
  | 'blog'
  | 'blog-post'
  | 'record-tool'
  | 'gone'
  | 'not-found';

export interface ParsedRoute {
  route: AppRoute;
  blogSlug: string | null;
  recordTool: RecordToolConfig | null;
  cleanPath: string;
  httpStatus: 200 | 404 | 410;
}

export const STATIC_LEGAL_ROUTES: LegalPageRoute[] = [
  'about',
  'contact',
  'privacy',
  'terms',
  'disclaimer',
];

export function normalizePathname(pathname: string): string {
  const withoutQuery = pathname.split('?')[0]?.split('#')[0] || '/';
  const collapsed = withoutQuery.replace(/\/+/g, '/');
  if (collapsed === '/' || collapsed === '/index.html') return '/';
  return collapsed.replace(/\/+$/, '');
}

export function parseAppRoute(pathname: string): ParsedRoute {
  const clean = normalizePathname(pathname);
  if (clean === '/') {
    return { route: 'home', blogSlug: null, recordTool: null, cleanPath: '/', httpStatus: 200 };
  }
  if (
    clean === '/about' ||
    clean === '/contact' ||
    clean === '/privacy' ||
    clean === '/terms' ||
    clean === '/disclaimer'
  ) {
    return {
      route: clean.slice(1) as LegalPageRoute,
      blogSlug: null,
      recordTool: null,
      cleanPath: clean,
      httpStatus: 200,
    };
  }
  if (clean === '/news') {
    return { route: 'news', blogSlug: null, recordTool: null, cleanPath: '/news', httpStatus: 200 };
  }
  if (clean === '/blog') {
    return { route: 'blog', blogSlug: null, recordTool: null, cleanPath: '/blog', httpStatus: 200 };
  }
  if (clean.startsWith('/blog/')) {
    const slug = clean.slice('/blog/'.length);
    if (slug && getBlogPostBySlug(slug)) {
      return {
        route: 'blog-post',
        blogSlug: slug,
        recordTool: null,
        cleanPath: `/blog/${slug}`,
        httpStatus: 200,
      };
    }
    if (slug && isGoneBlogSlug(slug)) {
      return {
        route: 'gone',
        blogSlug: slug,
        recordTool: null,
        cleanPath: clean,
        httpStatus: 410,
      };
    }
    return {
      route: 'not-found',
      blogSlug: null,
      recordTool: null,
      cleanPath: clean,
      httpStatus: 404,
    };
  }

  if (clean.startsWith('/')) {
    const slug = clean.slice(1);
    const tool = getRecordToolBySlug(slug);
    if (tool) {
      return {
        route: 'record-tool',
        blogSlug: null,
        recordTool: tool,
        cleanPath: `/${tool.slug}`,
        httpStatus: 200,
      };
    }
  }

  if (clean === '/410.html') {
    return { route: 'gone', blogSlug: null, recordTool: null, cleanPath: '/410.html', httpStatus: 410 };
  }

  return {
    route: 'not-found',
    blogSlug: null,
    recordTool: null,
    cleanPath: clean,
    httpStatus: 404,
  };
}

export interface PageSeoMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: 'website' | 'article';
  ogImage: string;
  ogImageAlt: string;
  robots: string;
  httpStatus: 200 | 404 | 410;
  jsonLd: Record<string, unknown>[];
}

export const HOMEPAGE_FAQ_ITEMS = [
  {
    q: 'How long does global DNS propagation take?',
    a: 'Most DNS record updates settle across major public resolvers within a few minutes up to 4 hours, governed by the previous record’s Time to Live (TTL). Full global convergence across every ISP cache and parent registry NS delegation can take 24 to 48 hours.',
  },
  {
    q: 'Why do different regions return different IP addresses for the same domain?',
    a: 'Global websites and CDNs intentionally use Anycast and GeoDNS (with EDNS Client Subnet routing) to steer visitors to the nearest regional edge server, or some recursive resolvers may still be serving a cached entry until the prior TTL expires.',
  },
  {
    q: 'What should I do before migrating a website to minimize downtime?',
    a: 'Lower the TTL on your existing A, AAAA, CNAME, and MX records to 300 seconds at least 24 hours ahead of cutover. Disable stale DNSSEC DS records at your registrar before switching nameservers, verify 100% regional propagation on DNS Locator, then restore normal TTLs.',
  },
  {
    q: 'Why are my emails landing in spam even though MX records exist?',
    a: 'Inbound email routing requires valid MX records, whereas outbound inbox trust depends on TXT records for SPF (v=spf1), DKIM signatures, a _dmarc policy, and matching reverse DNS (PTR) hostnames on sending mail IPs.',
  },
  {
    q: 'Is DNS Locator affiliated with ICANN or any domain registrar?',
    a: 'No. DNS Locator is an independent public DNS diagnostic utility operated by its engineering team. It displays publicly available DNS records queried in parallel through public DNS over HTTPS (DoH) and regional checkpoints.',
  },
] as const;

function buildOrganizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORGANIZATION_INFO.name,
    url: ORGANIZATION_INFO.url,
    logo: {
      '@type': 'ImageObject',
      url: ORGANIZATION_INFO.logo,
    },
    description: ORGANIZATION_INFO.description,
    sameAs: ORGANIZATION_INFO.sameAs,
  };
}

function buildBreadcrumbSchema(items: Array<{ name: string; path: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: `${SITE_ORIGIN}${item.path}`,
    })),
  };
}

function buildBlogPostingSchema(post: BlogPost): Record<string, unknown> {
  const author = getAuthorById(post.authorId);
  const fullImage = `${SITE_ORIGIN}${post.shareImage}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.metaDescription,
    image: [fullImage],
    datePublished: `${post.publishedAt}T08:00:00Z`,
    dateModified: `${post.updatedAt}T08:00:00Z`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_ORIGIN}/blog/${post.slug}`,
    },
    author: {
      '@type': 'Person',
      name: author.name,
      jobTitle: author.role,
      url: `${SITE_ORIGIN}/about`,
    },
    publisher: {
      '@type': 'Organization',
      name: ORGANIZATION_INFO.name,
      url: ORGANIZATION_INFO.url,
      logo: {
        '@type': 'ImageObject',
        url: ORGANIZATION_INFO.logo,
      },
    },
    keywords: post.keywords.join(', '),
  };
}

export function getPageSeoMeta(
  pathname: string,
  options?: { origin?: string; hasSearchQuery?: boolean }
): PageSeoMeta {
  const origin = (options?.origin || SITE_ORIGIN).replace(/\/$/, '');
  const parsed = parseAppRoute(pathname);
  const orgSchema = buildOrganizationSchema();

  if (parsed.route === 'home') {
    const canonicalUrl = `${origin}/`;
    return {
      title: 'DNS Locator – Global DNS Propagation & Record Lookup',
      description:
        'Verify live A, AAAA, CNAME, MX, TXT, NS, SOA, CAA, and PTR DNS records across 18 global checkpoints in seconds with DNS Locator.',
      canonicalUrl,
      ogType: 'website',
      ogImage: `${SITE_ORIGIN}/og-image.jpg`,
      ogImageAlt: 'DNS Locator – Global DNS Propagation & Record Lookup',
      robots: options?.hasSearchQuery ? 'noindex, follow' : 'index, follow',
      httpStatus: 200,
      jsonLd: [
        orgSchema,
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'DNS Locator',
          alternateName: 'dnslocator.online',
          url: `${SITE_ORIGIN}/`,
          description:
            'Global DNS Propagation & Record Lookup — Verify live DNS records across 18 regions in seconds.',
          potentialAction: {
            '@type': 'SearchAction',
            target: `${SITE_ORIGIN}/?domain={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'DNS Locator',
          url: `${SITE_ORIGIN}/`,
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'All',
          image: `${SITE_ORIGIN}/og-image.jpg`,
          description:
            'Verify live A, AAAA, CNAME, MX, TXT, NS, SOA, CAA, and PTR DNS records across 18 worldwide checkpoints.',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          featureList: [
            'Global DNS propagation checks across 18 worldwide locations',
            'Parallel A, AAAA, CNAME, MX, TXT, NS, SOA, and CAA record lookups',
            'Email SPF and DMARC health verification',
            'Public DNS over HTTPS (DoH) parallel zone resolution',
          ],
        },
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: HOMEPAGE_FAQ_ITEMS.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.a,
            },
          })),
        },
        buildBreadcrumbSchema([{ name: 'DNS Locator', path: '/' }]),
      ],
    };
  }

  if (parsed.route === 'record-tool' && parsed.recordTool) {
    const tool = parsed.recordTool;
    const author = getAuthorById(tool.authorId);
    const canonicalUrl = `${origin}/${tool.slug}`;
    return {
      title: tool.title,
      description: tool.metaDescription,
      canonicalUrl,
      ogType: 'website',
      ogImage: `${SITE_ORIGIN}/images/dns-results-preview.jpg`,
      ogImageAlt: `${tool.navLabel} propagation diagnostics on DNS Locator`,
      robots: options?.hasSearchQuery ? 'noindex, follow' : 'index, follow',
      httpStatus: 200,
      jsonLd: [
        orgSchema,
        buildBreadcrumbSchema([
          { name: 'DNS Locator', path: '/' },
          { name: tool.navLabel, path: `/${tool.slug}` },
        ]),
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: `${tool.navLabel} – DNS Locator`,
          url: `${SITE_ORIGIN}/${tool.slug}`,
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'All',
          image: `${SITE_ORIGIN}/images/dns-results-preview.jpg`,
          description: tool.metaDescription,
          author: {
            '@type': 'Person',
            name: author.name,
            jobTitle: author.role,
          },
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
        },
      ],
    };
  }

  if (parsed.route === 'blog-post' && parsed.blogSlug) {
    const post = getBlogPostBySlug(parsed.blogSlug)!;
    const canonicalUrl = `${origin}/blog/${post.slug}`;
    return {
      title: `${post.title} – DNS Locator`,
      description: post.metaDescription,
      canonicalUrl,
      ogType: 'article',
      ogImage: `${SITE_ORIGIN}${post.shareImage}`,
      ogImageAlt: post.shareImageAlt,
      robots: 'index, follow',
      httpStatus: 200,
      jsonLd: [
        orgSchema,
        buildBreadcrumbSchema([
          { name: 'DNS Locator', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: post.title, path: `/blog/${post.slug}` },
        ]),
        buildBlogPostingSchema(post),
      ],
    };
  }

  if (parsed.route === 'blog') {
    const canonicalUrl = `${origin}/blog`;
    return {
      title: 'DNS Engineering Blog & Propagation Guides – DNS Locator',
      description:
        'In-depth DNS propagation guides, IP routing diagnostics, traceroute tutorials, and email authentication articles written by DNS Locator engineers.',
      canonicalUrl,
      ogType: 'website',
      ogImage: `${SITE_ORIGIN}/images/blog-propagation-guide.jpg`,
      ogImageAlt: 'DNS Locator Engineering Blog & Propagation Guides',
      robots: 'index, follow',
      httpStatus: 200,
      jsonLd: [
        orgSchema,
        buildBreadcrumbSchema([
          { name: 'DNS Locator', path: '/' },
          { name: 'Blog', path: '/blog' },
        ]),
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'DNS Locator Engineering Blog',
          url: `${SITE_ORIGIN}/blog`,
          description:
            'Technical field guides covering global DNS propagation, IP routing, traceroute diagnostics, and email security.',
        },
      ],
    };
  }

  if (parsed.route === 'news') {
    const canonicalUrl = `${origin}/news`;
    return {
      title: 'Network & DNS Infrastructure Newsroom – DNS Locator',
      description:
        'Live DNS resolution, BGP routing stability, IPv6 adoption, and internet security briefings curated by DNS Locator.',
      canonicalUrl,
      ogType: 'website',
      ogImage: `${SITE_ORIGIN}/images/dns-propagation-map.jpg`,
      ogImageAlt: 'DNS Locator Network & Infrastructure Newsroom',
      robots: 'index, follow',
      httpStatus: 200,
      jsonLd: [
        orgSchema,
        buildBreadcrumbSchema([
          { name: 'DNS Locator', path: '/' },
          { name: 'News', path: '/news' },
        ]),
      ],
    };
  }

  if (
    parsed.route === 'about' ||
    parsed.route === 'contact' ||
    parsed.route === 'privacy' ||
    parsed.route === 'terms' ||
    parsed.route === 'disclaimer'
  ) {
    const metaMap: Record<LegalPageRoute, { title: string; desc: string; label: string }> = {
      about: {
        title: 'About DNS Locator – Team, Architecture & Resolver Methodology',
        desc: 'Meet the network engineers behind DNS Locator and learn how we query 18 global public DNS over HTTPS checkpoints cleanly and accurately.',
        label: 'About',
      },
      contact: {
        title: 'Contact – DNS Locator',
        desc: 'Contact the DNS Locator engineering team for technical support, regional checkpoint requests, or GDPR inquiries.',
        label: 'Contact',
      },
      privacy: {
        title: 'Privacy Policy & GDPR – DNS Locator',
        desc: 'Read the DNS Locator Privacy Policy and GDPR disclosures covering DNS queries, consent preferences, and security rate limiting.',
        label: 'Privacy Policy',
      },
      terms: {
        title: 'Terms and Conditions – DNS Locator',
        desc: 'Review the DNS Locator Terms and Conditions governing acceptable use of our public DNS propagation and zone lookup tools.',
        label: 'Terms and Conditions',
      },
      disclaimer: {
        title: 'Disclaimer – DNS Locator',
        desc: 'Read the DNS Locator Disclaimer regarding public DNS lookup data, non-affiliation with ICANN/registrars, and TTL propagation.',
        label: 'Disclaimer',
      },
    };
    const info = metaMap[parsed.route];
    const canonicalUrl = `${origin}/${parsed.route}`;
    return {
      title: info.title,
      description: info.desc,
      canonicalUrl,
      ogType: 'website',
      ogImage: `${SITE_ORIGIN}/og-image.jpg`,
      ogImageAlt: 'DNS Locator – Global DNS Propagation & Record Lookup',
      robots: 'index, follow',
      httpStatus: 200,
      jsonLd: [
        orgSchema,
        buildBreadcrumbSchema([
          { name: 'DNS Locator', path: '/' },
          { name: info.label, path: `/${parsed.route}` },
        ]),
        {
          '@context': 'https://schema.org',
          '@type': parsed.route === 'about' ? 'AboutPage' : parsed.route === 'contact' ? 'ContactPage' : 'WebPage',
          name: info.title,
          url: `${SITE_ORIGIN}/${parsed.route}`,
          description: info.desc,
        },
      ],
    };
  }

  if (parsed.route === 'gone') {
    return {
      title: 'Article Removed (410 Gone) – DNS Locator',
      description: 'This retired article has been permanently removed from DNS Locator.',
      canonicalUrl: `${origin}/blog`,
      ogType: 'website',
      ogImage: `${SITE_ORIGIN}/og-image.jpg`,
      ogImageAlt: 'DNS Locator',
      robots: 'noindex, follow',
      httpStatus: 410,
      jsonLd: [orgSchema],
    };
  }

  return {
    title: 'Page Not Found (404) – DNS Locator',
    description:
      'The requested DNS Locator page could not be found. Return to the homepage to run a global DNS propagation lookup.',
    canonicalUrl: `${origin}/`,
    ogType: 'website',
    ogImage: `${SITE_ORIGIN}/og-image.jpg`,
    ogImageAlt: 'DNS Locator',
    robots: 'noindex, nofollow',
    httpStatus: 404,
    jsonLd: [orgSchema],
  };
}

export function getAllPrerenderRoutes(): string[] {
  return [
    '/',
    '/news',
    '/blog',
    ...BLOG_POSTS.map((p) => `/blog/${p.slug}`),
    ...RECORD_TOOLS.map((t) => `/${t.slug}`),
    ...STATIC_LEGAL_ROUTES.map((r) => `/${r}`),
  ];
}

export function getSitemapEntries(origin = SITE_ORIGIN): Array<{
  loc: string;
  lastmod: string;
  changefreq: 'weekly' | 'monthly';
  priority: string;
}> {
  const cleanOrigin = origin.replace(/\/$/, '');
  const defaultDate = '2026-11-23';

  const entries: Array<{
    loc: string;
    lastmod: string;
    changefreq: 'weekly' | 'monthly';
    priority: string;
  }> = [
    { loc: `${cleanOrigin}/`, lastmod: defaultDate, changefreq: 'weekly', priority: '1.0' },
    ...RECORD_TOOLS.map((tool) => ({
      loc: `${cleanOrigin}/${tool.slug}`,
      lastmod: tool.updatedAt,
      changefreq: 'weekly' as const,
      priority: '0.9',
    })),
    { loc: `${cleanOrigin}/blog`, lastmod: defaultDate, changefreq: 'weekly', priority: '0.8' },
    ...BLOG_POSTS.map((post) => ({
      loc: `${cleanOrigin}/blog/${post.slug}`,
      lastmod: post.updatedAt,
      changefreq: 'monthly' as const,
      priority: post.isPillarGuide ? '0.9' : '0.8',
    })),
    { loc: `${cleanOrigin}/news`, lastmod: defaultDate, changefreq: 'weekly', priority: '0.7' },
    ...STATIC_LEGAL_ROUTES.map((r) => ({
      loc: `${cleanOrigin}/${r}`,
      lastmod: defaultDate,
      changefreq: 'monthly' as const,
      priority: '0.6',
    })),
  ];

  return entries;
}
