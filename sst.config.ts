/// <reference path="./.sst/platform/config.d.ts" />

// Life Log is a fully static client-side SPA (React + Vite, Dexie/IndexedDB,
// PWA). There is no backend, so hosting is just S3 + CloudFront behind SST's
// StaticSite component, with a custom domain managed in Cloudflare.
//
// Hosting account: deploys into the existing rembr "dev" AWS account. The SST
// app name here is "life-log" (distinct from "patrimonium"), so all resources
// are namespaced separately and never collide with patrimonium in that account.
//
// Domain: lifelog.bxtn.dev, with DNS records created in the bxtn.dev Cloudflare
// zone. Requires CLOUDFLARE_API_TOKEN in the environment (Zone:Read + DNS:Edit
// scoped to bxtn.dev). SST provisions the ACM cert (in us-east-1, for CloudFront)
// and the validation + alias records automatically.
//
// Conventions mirrored from ../patrimonium: Cloudflare DNS adapter, stage-aware
// removal/protect, invalidation.wait: false.

// The canonical host lives on the primary "dev" stage (what push-to-main and
// `pnpm deploy` target). Any other stage gets a prefixed host so parallel
// stages (PR previews, experiments) never fight over the same DNS record.
function resolveHost(stage: string): string {
  return stage === "dev" ? "lifelog.bxtn.dev" : `lifelog-${stage}.bxtn.dev`;
}

export default $config({
  app(input) {
    const isProd = input?.stage === "prod";

    return {
      name: "life-log",
      home: "aws",
      // Keep resources on `sst remove` for prod; tear everything down otherwise.
      removal: isProd ? "retain" : "remove",
      protect: isProd,
      providers: {
        aws: "7.20.0",
        cloudflare: {
          version: "6.13.0",
          apiToken: process.env.CLOUDFLARE_API_TOKEN,
        },
      },
    };
  },
  async run() {
    const site = new sst.aws.StaticSite("LifeLog", {
      build: {
        // SST runs this during `sst deploy`, so CI only needs to install deps.
        command: "pnpm build",
        output: "dist",
      },
      domain: {
        name: resolveHost($app.stage),
        // DNS-only (grey cloud): a straight CNAME to CloudFront, which serves
        // its own TLS. Avoids Cloudflare's proxy SSL-mode gotchas. Flip to
        // `sst.cloudflare.dns({ proxy: true })` later if you want Cloudflare's
        // edge in front.
        dns: sst.cloudflare.dns(),
      },
      // SPA routing: react-router owns the path space, so serve index.html for
      // any unmatched path (deep links, hard refresh) instead of a 404.
      errorPage: "index.html",
      invalidation: {
        wait: false,
      },
    });

    return {
      url: site.url,
    };
  },
});
