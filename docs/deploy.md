# Deploying Life Log

Life Log is a fully static client-side app (React + Vite, Dexie/IndexedDB, PWA)
with **no backend**. Hosting is just **S3 + CloudFront**, provisioned as code via
[SST](https://sst.dev)'s `StaticSite` component (`sst.config.ts`), with a custom
domain managed in Cloudflare.

- **Live URL:** https://lifelog.bxtn.dev
- **AWS account:** the existing rembr **dev** account (shared, not a new account).
  The SST app is named `life-log`, so its resources are namespaced separately and
  never collide with patrimonium in that account.
- **DNS:** the `bxtn.dev` Cloudflare zone. SST creates the ACM cert (in us-east-1,
  for CloudFront) and the validation + alias records automatically.

At personal traffic this costs **pennies/month** — S3 stores a few MB and
CloudFront serves a ~1 MB bundle that the PWA service worker then caches.

## One-time setup

You're reusing the rembr dev account, so the AWS side is mostly already there.

### 1. Cloudflare API token (for `bxtn.dev`)

Create a token scoped to the `bxtn.dev` zone with **Zone:Read + DNS:Edit**.
SST uses it to create the cert-validation and alias records. Keep it out of git —
it's supplied via the `CLOUDFLARE_API_TOKEN` environment variable.

### 2. AWS access into the rembr dev account

- **Local deploys:** any profile/credentials for the rembr dev account work
  (`AWS_PROFILE=...`). SST stores its state in that account's bootstrap bucket,
  separate per app.
- **CI deploys:** the rembr dev account needs a GitHub OIDC identity provider
  (`https://token.actions.githubusercontent.com`, audience `sts.amazonaws.com`)
  and a deploy role whose trust policy allows `repo:bbux-dev/periplus:*`. If the
  account already has the OIDC provider for patrimonium, you only need to add a
  role (or trust statement) for this repo. The role needs permission to manage
  S3, CloudFront, ACM, and IAM, plus the SST state bucket/lock table.

### 3. GitHub config

Repo → **Settings → Secrets and variables → Actions** (or scope to a `dev`
Environment):

- Secret `AWS_DEPLOY_ROLE_ARN` → the deploy role ARN in the rembr dev account.
- Secret `CLOUDFLARE_API_TOKEN` → the `bxtn.dev` token from step 1.
- Variable `AWS_REGION` → e.g. `us-east-1` (optional; defaults to `us-east-1`).

## Deploying

- **Automatic:** every push to `main` deploys the `dev` stage → `lifelog.bxtn.dev`.
- **Manual:** Actions → **Deploy** → *Run workflow*.

First deploy takes a few minutes while ACM validates the cert via the Cloudflare
DNS records SST creates. Subsequent deploys are fast.

## Local deploys

With rembr-dev credentials and the Cloudflare token in your shell:

```bash
export AWS_PROFILE=<rembr-dev-profile>
export CLOUDFLARE_API_TOKEN=<bxtn.dev-token>
pnpm install
pnpm deploy          # sst deploy --stage dev  -> lifelog.bxtn.dev
pnpm sst:remove      # tear down the dev stage
```

## Stages & domains

`sst.config.ts` maps the `dev` stage to the canonical `lifelog.bxtn.dev`. Any
other stage name gets a prefixed host (`lifelog-<stage>.bxtn.dev`) so a second
stage never fights over the same DNS record. Only `prod` is configured with
`removal: retain` + `protect`.
