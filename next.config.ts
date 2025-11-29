import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force webpack (default) and tell it to ignore optional native deps pulled in by duckdb.
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "aws-sdk": false,
      "mock-aws-s3": false,
      nock: false,
      "@mapbox/node-pre-gyp/lib/util/nw-pre-gyp/index.html": false,
      "node-gyp/lib/Find-VisualStudio.cs": false,
    };

    config.module.rules.push(
      {
        test: /\.html$/i,
        type: "asset/resource",
      },
      {
        test: /\.cs$/i,
        type: "asset/resource",
      },
    );

    return config;
  },
};

export default nextConfig;
