import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  // Permanent redirects for renamed article URLs. A slug change breaks every
  // link already in the wild — dispatch emails already sent, LinkedIn posts,
  // anything Google has indexed — so the old path has to keep resolving.
  // 308 tells crawlers the move is permanent and passes the ranking on.
  async redirects() {
    return [
      {
        // Published 2026-07-04 with a raw UUID for a slug, which ranks for
        // nothing and reads as broken when shared.
        source: '/atlas-brief/b53f79b1-3d53-4b1c-849b-50baca9a997a',
        destination: '/atlas-brief/pacific-palisades-rebuild-250-properties',
        permanent: true,
      },
    ]
  },
};

export default withPayload(nextConfig);
