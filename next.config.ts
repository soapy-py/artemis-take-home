import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbo: {
    // DuckDB pulls in optional deps and ancillary files that Turbopack tries to bundle.
    // Alias them to false so they are ignored, and treat odd extensions as assets.
    resolveAlias: {
      "aws-sdk": false,
      "mock-aws-s3": false,
      nock: false,
      "@mapbox/node-pre-gyp/lib/util/nw-pre-gyp/index.html": false,
      "node-gyp/lib/Find-VisualStudio.cs": false,
    },
    rules: {
      "*.html": {
        as: "asset",
      },
      "*.cs": {
        as: "asset",
      },
    },
  },
};

export default nextConfig;
