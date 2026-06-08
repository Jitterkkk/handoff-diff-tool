import { z } from 'zod'

export const DiffResultSchema = z.object({
  nodeId: z.string(),
  nodeName: z.string(),
  type: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
})

export const PublishReviewBodySchema = z.object({
  fileKey: z.string().min(1),
  fileName: z.string().min(1).default('Untitled File'),
  frameId: z.string().min(1),
  frameName: z.string().min(1),
  description: z.string().default(''),
  publishedBy: z.object({
    figmaUserId: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email().optional(),
    avatarUrl: z.string().url().optional(),
  }),
  items: z.array(DiffResultSchema),
})

export const ListReviewsQuerySchema = z.object({
  fileKey: z.string().min(1).optional(),
  status: z.enum(['pending', 'in_progress', 'done', 'archived']).optional(),
})

export const PatchReviewItemBodySchema = z.object({
  checked: z.boolean(),
  checkedBy: z.object({
    figmaUserId: z.string().min(1),
    name: z.string().min(1),
  }).optional(),
})

export const PatchPublicReviewItemBodySchema = z.object({
  checked: z.boolean(),
})

export const ReviewParamsSchema = z.object({
  reviewId: z.string().uuid(),
})

export const ReviewItemParamsSchema = z.object({
  reviewId: z.string().uuid(),
  itemId: z.string().uuid(),
})

export type PublishReviewBody = z.infer<typeof PublishReviewBodySchema>
export type ListReviewsQuery = z.infer<typeof ListReviewsQuerySchema>
export type PatchReviewItemBody = z.infer<typeof PatchReviewItemBodySchema>
export type PatchPublicReviewItemBody = z.infer<typeof PatchPublicReviewItemBodySchema>
export type DiffResult = z.infer<typeof DiffResultSchema>
