import type { MetadataRoute } from "next";
import { getSiteAssetUrl, withBasePath } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: withBasePath("/"),
    },
    sitemap: getSiteAssetUrl("/sitemap.xml"),
  };
}
