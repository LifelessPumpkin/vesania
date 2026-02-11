// import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  allowedDevOrigins: ["*.local", "10.*", "192.168.*", "172.16.*"],
};
module.exports = nextConfig;

export default nextConfig;
