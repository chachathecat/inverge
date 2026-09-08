import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // The local trial probes Git containment at runtime; Git metadata is not a
  // deployable dependency. This affects packaging only, not that safety check.
  outputFileTracingExcludes: {
    "/app/first-stage/economics-trial": [".git", ".git/**/*"],
    "/api/review-os/first-stage/economics-trial/sessions": [".git", ".git/**/*"],
  },
};

export default nextConfig;
