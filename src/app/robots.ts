import type { MetadataRoute } from "next";

/** The management portal must never appear in search results. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
