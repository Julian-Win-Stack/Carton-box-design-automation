/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // sharp ships a native binary; keep it out of the server-component
    // bundling pipeline so webpack doesn't try to traverse it.
    serverComponentsExternalPackages: ['sharp'],
  },
};

export default nextConfig;
