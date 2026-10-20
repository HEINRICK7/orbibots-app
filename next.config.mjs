import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const onAmplify = Boolean(process.env.AWS_APP_ID || process.env.AWS_BRANCH);
// Amplify SSR does not receive branch env at runtime, and .env.production stays outside .next.
const publishedConfig = [
  "ORBIBOTS_FRONTEND_ORIGIN",
  "ORBIBOTS_API_ORIGIN",
  "COGNITO_MANAGED_LOGIN_URL",
  "COGNITO_APP_CLIENT_ID",
  "COGNITO_ISSUER_URI",
];
const env = Object.fromEntries(publishedConfig.filter((key) => process.env[key]).map((key) => [key, process.env[key]]));

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  env,
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
