import { withSentryConfig } from "@sentry/nextjs";
import { i18n } from "./i18n.config.mjs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const json = require("./package.json");

/**
 * Source maps are only generated and uploaded to Sentry when an auth token is provided.
 * Without one, the Sentry webpack plugin is disabled, which makes builds faster and use less memory.
 */
const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN || undefined;
const uploadSourceMaps = Boolean(SENTRY_AUTH_TOKEN);

/**
 * @template {import("next").NextConfig} T
 * @typedef {T}
 */
const nextConfig = {
  i18n,
  cleanDistDir: true,
  // gzip responses in Next.js. Set NEXT_DISABLE_COMPRESSION=true when the reverse proxy compresses instead.
  compress: process.env.NEXT_DISABLE_COMPRESSION !== "true",
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  experimental: {
    webpackBuildWorker: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // prettier-ignore
  images: { // start images
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.imgur.com",
        pathname: "**"
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "**"
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "**"
      },
    ]
  }, // end images
  // prettier-enable
  webpack(config, { webpack }) {
    config.plugins.push(
      new webpack.DefinePlugin({
        __SENTRY_DEBUG__: false,
      }),
    );
    return config;
  },
  sentry: {
    hideSourceMaps: true,
    widenClientFileUpload: true,
    disableServerWebpackPlugin: !uploadSourceMaps,
    disableClientWebpackPlugin: !uploadSourceMaps,
  },
}; // end config

/** @type {typeof nextConfig} */
export default (phase, defaultConfig) => {
  const plugins = [
    (config) =>
      withSentryConfig(
        config,
        {
          org: "snailycad",
          setCommits: true,
          project: "snailycad-client",
          authToken: SENTRY_AUTH_TOKEN,
          release: json.version,
          silent: true,
        },
        {
          tunnelRoute: "/api/monitoring-tunnel",
          hideSourceMaps: true,
          widenClientFileUpload: true,
          disableServerWebpackPlugin: !uploadSourceMaps,
          disableClientWebpackPlugin: !uploadSourceMaps,
        },
      ),
  ];

  const config = plugins.reduce(
    (acc, plugin) => {
      const pluginReturnValue = plugin(acc);

      let newConfig;
      if (typeof pluginReturnValue === "function") {
        newConfig = pluginReturnValue(phase, defaultConfig);
      } else {
        newConfig = pluginReturnValue;
      }

      return newConfig;
    },
    { ...nextConfig },
  );

  return config;
};
