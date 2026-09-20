/** @type {import('next').NextConfig} */
const nextConfig = {
  // Inside the workspace `@liveog/react` resolves to its raw `src/index.tsx`
  // rather than a built `dist`, so Next has to compile it like app code.
  // A published install of `@liveog/react` ships JS and does not need this.
  transpilePackages: ['@liveog/react', '@liveog/core'],
}

export default nextConfig
