import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  turbopack: {},
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.1.32",
    "192.168.1.0/24",
    "dash.clvs.nl",
  ],
};

export default withSerwist(nextConfig);
