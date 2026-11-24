import { renderToString } from 'react-dom/server';
import App from './App.tsx';
import { AppErrorBoundary } from './components/StatusTemplates.tsx';
import { I18nProvider } from './lib/i18n.tsx';
import {
  getAllPrerenderRoutes,
  getPageSeoMeta,
  getSitemapEntries,
  parseAppRoute,
  type PageSeoMeta,
} from './lib/seo.ts';

export { getAllPrerenderRoutes, getPageSeoMeta, getSitemapEntries, parseAppRoute };
export type { PageSeoMeta };

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderHeadTags(seo: PageSeoMeta): string {
  const ldBlocks = seo.jsonLd
    .map(
      (schema) =>
        `    <script type="application/ld+json" data-seo-ld="true">${JSON.stringify(schema).replace(
          /<\/script/gi,
          '<\\/script'
        )}</script>`
    )
    .join('\n');

  return [
    `    <title>${escapeHtmlText(seo.title)}</title>`,
    `    <meta name="description" content="${escapeHtmlAttr(seo.description)}" />`,
    `    <meta name="robots" content="${escapeHtmlAttr(seo.robots)}" />`,
    `    <link rel="canonical" href="${escapeHtmlAttr(seo.canonicalUrl)}" />`,
    `    <meta property="og:type" content="${escapeHtmlAttr(seo.ogType)}" />`,
    `    <meta property="og:site_name" content="DNS Locator" />`,
    `    <meta property="og:url" content="${escapeHtmlAttr(seo.canonicalUrl)}" />`,
    `    <meta property="og:title" content="${escapeHtmlAttr(seo.title)}" />`,
    `    <meta property="og:description" content="${escapeHtmlAttr(seo.description)}" />`,
    `    <meta property="og:image" content="${escapeHtmlAttr(seo.ogImage)}" />`,
    `    <meta property="og:image:secure_url" content="${escapeHtmlAttr(seo.ogImage)}" />`,
    `    <meta property="og:image:type" content="image/jpeg" />`,
    `    <meta property="og:image:width" content="1280" />`,
    `    <meta property="og:image:height" content="720" />`,
    `    <meta property="og:image:alt" content="${escapeHtmlAttr(seo.ogImageAlt)}" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:title" content="${escapeHtmlAttr(seo.title)}" />`,
    `    <meta name="twitter:description" content="${escapeHtmlAttr(seo.description)}" />`,
    `    <meta name="twitter:image" content="${escapeHtmlAttr(seo.ogImage)}" />`,
    `    <meta name="twitter:image:alt" content="${escapeHtmlAttr(seo.ogImageAlt)}" />`,
    ldBlocks,
  ].join('\n');
}

export function renderRoute(
  pathname: string,
  options?: { origin?: string; hasSearchQuery?: boolean }
): { html: string; seo: PageSeoMeta } {
  const seo = getPageSeoMeta(pathname, options);
  const html = renderToString(
    <AppErrorBoundary>
      <I18nProvider>
        <App initialPath={pathname} />
      </I18nProvider>
    </AppErrorBoundary>
  );
  return { html, seo };
}
