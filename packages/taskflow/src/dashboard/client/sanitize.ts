import { defaultSchema } from "rehype-sanitize";

/**
 * N274 (A38) — rehype-sanitize's default schema allows `<img src="https://…">`,
 * so merely viewing an agent-written TASK.md / REVIEW.md / module body could
 * beacon the viewer's IP + time to any host (there is no CSP to stop it either —
 * the dashboard also adds one now). Task docs don't need remote images, so we
 * drop the `img` tag entirely and keep the rest of the safe default schema.
 */
export const mdSanitizeSchema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter((t) => t !== "img"),
};
