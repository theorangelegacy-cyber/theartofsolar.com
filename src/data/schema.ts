import { BRAND, BUSINESS, CITIES, COUNTIES, OWNER, SERVICES, SITE_URL } from "./seo";
import { IMG } from "./images";

/** Turn a site-relative path into a full https:// address. */
export function abs(path: string): string {
  if (!path) return SITE_URL;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

const AREA_SERVED = [
  ...COUNTIES.map((k) => ({ "@type": "AdministrativeArea", name: `${k.name} County, FL` })),
  ...CITIES.map((c) => ({ "@type": "City", name: `${c.name}, FL` })),
];

/** The company itself. Referenced by @id from every other block. */
export const ORGANIZATION_ID = `${SITE_URL}/#business`;

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["HomeAndConstructionBusiness", "LocalBusiness"],
    "@id": ORGANIZATION_ID,
    name: BRAND,
    url: SITE_URL,
    logo: BUSINESS.logo,
    image: abs(IMG.og),
    ...(BUSINESS.phone ? { telephone: BUSINESS.phone } : {}),
    email: BUSINESS.email,
    priceRange: BUSINESS.priceRange,
    description: BUSINESS.description,
    founder: { "@type": "Person", name: OWNER },
    foundingDate: BUSINESS.foundingYear,
    sameAs: [BUSINESS.facebook],
    address: {
      "@type": "PostalAddress",
      addressLocality: BUSINESS.locality,
      postalCode: BUSINESS.postalCode,
      addressRegion: BUSINESS.region,
      addressCountry: BUSINESS.country,
    },
    areaServed: AREA_SERVED,
    knowsAbout: [
      "Solar panel removal and reinstall",
      "Solar detach and reset for roof replacement",
      "Solar re-racking",
      "Orphaned solar system repair",
      "Solar roof leak repair",
      "Solar system inspection",
      "Hurricane damage solar repair",
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Solar re-rack and service",
      itemListElement: SERVICES.map((s) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: s.name,
          description: s.short,
          url: `${SITE_URL}/services/${s.slug}`,
        },
      })),
    },
  };
}

/** The site itself. Referenced by @id from the page records. */
export const WEBSITE_ID = `${SITE_URL}/#website`;

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: BRAND,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

/**
 * One guide page as a record in its own right, joined to the site and to the
 * business by @id rather than repeating either.
 *
 * Deliberately WebPage and not Article. An Article record wants a real
 * datePublished and a named author byline, and neither is visible anywhere on
 * these pages. Making either one up to earn a richer schema type is exactly the
 * kind of thing that gets structured data distrusted.
 */
export function webPageSchema(opts: { name: string; description: string; url: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${opts.url}#webpage`,
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: "en-US",
    mainEntityOfPage: opts.url,
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORGANIZATION_ID },
    about: { "@id": ORGANIZATION_ID },
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: `${SITE_URL}${t.path}`,
    })),
  };
}

export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/**
 * A single service, optionally pinned to one place.
 *
 * A county page must say the county, not its county seat: naming Fort Lauderdale
 * on a page whose title, heading and breadcrumb all say Broward County left
 * Google with two different answers and no reason to trust either. Pass
 * `cityName` for a town, or `areaName` plus `areaType` for anything larger.
 */
export function serviceSchema(opts: {
  name: string;
  description: string;
  url: string;
  image?: string;
  /** A town. Named "... in Orlando, FL" and served as a City. */
  cityName?: string;
  /** Anything that is not a town, written out in full, e.g. "Broward County, FL". */
  areaName?: string;
  areaType?: "AdministrativeArea" | "State" | "City";
}) {
  const place = opts.areaName ?? (opts.cityName ? `${opts.cityName}, FL` : null);
  const placeType = opts.areaName ? (opts.areaType ?? "AdministrativeArea") : "City";
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    // One @id per page so the same service on the service page, the cost page
    // and the city pages is one entity Google can join up, not four strangers.
    "@id": `${opts.url}#service`,
    serviceType: opts.name,
    name: place ? `${opts.name} in ${place}` : opts.name,
    description: opts.description,
    url: opts.url,
    mainEntityOfPage: opts.url,
    ...(opts.image ? { image: abs(opts.image) } : {}),
    provider: { "@id": ORGANIZATION_ID },
    // The full 65-item list belongs to the business block once, not to every
    // Service block on all 147 pages.
    areaServed: place ? { "@type": placeType, name: place } : { "@type": "State", name: "Florida" },
  };
}

/** Build the <script> entries TanStack head() expects. */
export function ld(...blocks: unknown[]) {
  return blocks.map((b) => ({
    type: "application/ld+json",
    children: JSON.stringify(b),
  }));
}
