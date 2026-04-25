import type { InferSelectModel } from "drizzle-orm";
import type { ProjectSummary } from "@/lib/api/contracts/projects";
import { projects } from "@/db/schema";

type ProjectRow = InferSelectModel<typeof projects>;

export function serializeProjectSummary(project: ProjectRow): ProjectSummary {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    tags: Array.isArray(project.tags) ? project.tags : [],
    thumbnailUrl: project.snapshot?.thumbnail?.url ?? null,
    updatedAt: project.updatedAt.toISOString(),
    version: project.version
  };
}
