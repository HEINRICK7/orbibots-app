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
};

export default nextConfig;
