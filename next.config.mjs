import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const onAmplify = Boolean(process.env.AWS_APP_ID || process.env.AWS_BRANCH);

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  ...(onAmplify
    ? {}
    : {
        output: "standalone",
        turbopack: { root: process.cwd() },
      }),
  webpack: (config) => {
    config.resolve.alias["@"] = path.join(root, "src");
    return config;
  },
};

export default nextConfig;
