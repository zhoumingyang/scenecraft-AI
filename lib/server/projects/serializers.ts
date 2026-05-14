import type { ProjectSummary } from "@/lib/api/contracts/projects";
import type { ProjectSummaryRow } from "@/lib/server/projects/queries";

export function serializeProjectSummary(project: ProjectSummaryRow): ProjectSummary {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    tags: Array.isArray(project.tags) ? project.tags : [],
    thumbnailUrl: project.thumbnailUrl,
    updatedAt: project.updatedAt.toISOString(),
    version: project.version
  };
}
