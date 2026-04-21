import { Helmet } from "react-helmet-async";

export const SITE_URL = "https://wanderluxe.io";
export const DEFAULT_OG_IMAGE =
  "https://arnengxblsfnezrqcsxw.supabase.co/storage/v1/object/public/logos/Black%20Full_v2.png";
const DEFAULT_DESCRIPTION =
  "WanderLuxe is an AI-powered luxury travel planning platform with real-time collaboration, curated itineraries, and professional PDF export.";

interface SEOProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "profile";
  noIndex?: boolean;
  jsonLd?: object | object[];
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  noIndex = false,
  jsonLd,
}: SEOProps) {
  const fullTitle = title
    ? title.endsWith("WanderLuxe")
      ? title
      : `${title} | WanderLuxe`
    : "WanderLuxe — AI-powered luxury travel planning";

  const canonical = canonicalPath
    ? `${SITE_URL}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`
    : undefined;

  const jsonLdArray = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={canonical} />}
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      {canonical && <meta property="og:url" content={canonical} />}
      <meta property="og:site_name" content="WanderLuxe" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLdArray.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
