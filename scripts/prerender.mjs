import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const SSR_DIR = path.resolve(ROOT_DIR, 'dist-ssr');
const TEMPLATE_PATH = path.join(DIST_DIR, 'index.html');

function resolveSsrEntryFile() {
  const candidates = ['entry-server.mjs', 'entry-server.js', 'entry-server.cjs'];
  for (const name of candidates) {
    const full = path.join(SSR_DIR, name);
    if (fs.existsSync(full)) return full;
  }
  throw new Error(`Could not locate built SSR bundle inside ${SSR_DIR}`);
}

function injectPrerenderedPage(template, renderedHtml, headTags) {
  let output = template;
  const seoMarkerRegex = /<!-- SEO_HEAD_START -->[\s\S]*?<!-- SEO_HEAD_END -->/;
  if (seoMarkerRegex.test(output)) {
    output = output.replace(
      seoMarkerRegex,
      () => `<!-- SEO_HEAD_START -->\n${headTags}\n    <!-- SEO_HEAD_END -->`
    );
  } else {
    output = output.replace('</head>', () => `${headTags}\n  </head>`);
  }

  output = output.replace(
    /<div id="root"><\/div>/,
    () => `<div id="root">${renderedHtml}</div>`
  );
  return output;
}

function writeRouteHtml(routePath, htmlContent) {
  const normalized = routePath === '/' ? '' : routePath.replace(/^\/+/, '').replace(/\/+$/, '');
  const outFile = normalized
    ? path.join(DIST_DIR, normalized, 'index.html')
    : path.join(DIST_DIR, 'index.html');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, htmlContent, 'utf-8');
  return path.relative(DIST_DIR, outFile);
}

async function main() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Built client template not found at ${TEMPLATE_PATH}`);
  }

  const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  const ssrEntry = resolveSsrEntryFile();
  const ssrModule = await import(pathToFileURL(ssrEntry).href);

  const rawOrigin = (
    process.env.CANONICAL_ORIGIN ||
    process.env.VITE_CANONICAL_ORIGIN ||
    'https://dnslocator.online'
  ).trim();
  const origin = rawOrigin.replace(/\/$/, '');
  const routes = ssrModule.getAllPrerenderRoutes();

  const written = [];
  for (const route of routes) {
    const { html, seo } = ssrModule.renderRoute(route, { origin });
    const headTags = ssrModule.renderHeadTags(seo);
    const fullHtml = injectPrerenderedPage(template, html, headTags);
    written.push(writeRouteHtml(route, fullHtml));
  }

  // Dedicated 404 and 410 static error pages for Cloudflare Assets not_found_handling="404-page" and direct serving
  for (const errorPage of [
    { route: '/404-not-found', fileName: '404.html' },
    { route: '/410.html', fileName: '410.html' },
  ]) {
    const { html, seo } = ssrModule.renderRoute(errorPage.route, { origin });
    const headTags = ssrModule.renderHeadTags(seo);
    const fullHtml = injectPrerenderedPage(template, html, headTags);
    fs.writeFileSync(path.join(DIST_DIR, errorPage.fileName), fullHtml, 'utf-8');
    written.push(errorPage.fileName);
  }

  // Generate fresh static sitemap.xml inside dist/
  const sitemapEntries = ssrModule.getSitemapEntries(origin);
  const urlXml = sitemapEntries
    .map(
      (entry) =>
        `  <url>\n    <loc>${entry.loc}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`
    )
    .join('\n');
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlXml}\n</urlset>\n`;
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf-8');

  // Remove temporary SSR bundle directory
  fs.rmSync(SSR_DIR, { recursive: true, force: true });

  console.log(`Prerendered ${written.length} static HTML pages + sitemap.xml into dist/`);
}

main().catch((err) => {
  console.error('Prerendering failed:', err);
  process.exit(1);
});
