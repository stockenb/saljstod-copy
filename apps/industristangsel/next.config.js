/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false, // döljer source maps i produktion
  compiler: {
    removeConsole: { exclude: ['error', 'warn'] }, // valfritt: rensa console.log i build
  },
};
module.exports = nextConfig;
