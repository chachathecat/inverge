export const FAST_OWNER_PREVIEW_BRANCH = "agent/fast-owner-preview" as const;

type FastOwnerPreviewEnvironment = Readonly<
  Record<string, string | undefined>
>;

export function isFastOwnerPreviewDeployment(
  environment: FastOwnerPreviewEnvironment = process.env,
) {
  return (
    environment.VERCEL_ENV === "preview" &&
    environment.VERCEL_GIT_COMMIT_REF === FAST_OWNER_PREVIEW_BRANCH
  );
}
