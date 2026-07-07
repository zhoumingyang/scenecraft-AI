import { NextResponse } from "next/server";
import type { SaveProjectRequest, SaveProjectResponse } from "@/lib/api/contracts/projects";
import { normalizeProjectAiLibrary, projectSaveRequestSchema } from "@/lib/project/schema";
import { withAuth } from "@/lib/server/auth/withAuth";
import { deleteBlobAssets } from "@/lib/server/assets/config";
import { getServerErrorStatus } from "@/lib/server/http/errors";
import { getErrorMessage } from "@/lib/server/http/getErrorMessage";
import { deleteProject, updateProject } from "@/lib/server/projects/mutations";
import { getProjectByIdForUser } from "@/lib/server/projects/queries";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const GET = withAuth<RouteContext>(async (_request, context, session) => {
  try {
    const { id } = await context.params;
    const project = await getProjectByIdForUser(id, session.user.id);

    if (!project) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({
      project: {
        id: project.id,
        version: project.version,
        updatedAt: project.updatedAt.toISOString(),
        snapshot: project.snapshot,
        aiSnapshot: normalizeProjectAiLibrary(project.aiSnapshot)
      }
    });
  } catch (error) {
    const message = getErrorMessage(error, "Failed to load project.");
    return NextResponse.json({ message }, { status: 500 });
  }
});

export const PUT = withAuth<RouteContext>(async (request, context, session) => {
  try {
    const { id } = await context.params;
    const payload = projectSaveRequestSchema.parse((await request.json()) as SaveProjectRequest);

    if (payload.snapshot.id !== id) {
      return NextResponse.json(
        { message: "Snapshot id must match the project id in the URL." },
        { status: 400 }
      );
    }

    const updateResult = await updateProject({
      projectId: id,
      userId: session.user.id,
      payload
    });
    const updated = updateResult.project;

    if (!updated) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }

    await deleteBlobAssets(updateResult.deletedAssetObjectKeys).catch((cleanupError) => {
      console.warn("[projects] Failed to delete replaced project assets.", cleanupError);
    });

    const response: SaveProjectResponse = {
      project: {
        id: updated.id,
        version: updated.version,
        updatedAt: updated.updatedAt.toISOString(),
        snapshot: updated.snapshot,
        aiSnapshot: normalizeProjectAiLibrary(updated.aiSnapshot)
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = getErrorMessage(error, "Failed to update project.");
    return NextResponse.json({ message }, { status: getServerErrorStatus(error, 400) });
  }
});

export const DELETE = withAuth<RouteContext>(async (_request, context, session) => {
  try {
    const { id } = await context.params;
    const deleteResult = await deleteProject(id, session.user.id);
    const deleted = deleteResult.project;
    if (!deleted) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }

    await deleteBlobAssets(deleteResult.deletedAssetObjectKeys).catch((cleanupError) => {
      console.warn("[projects] Failed to delete project assets.", cleanupError);
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = getErrorMessage(error, "Failed to delete project.");
    return NextResponse.json({ message }, { status: getServerErrorStatus(error, 400) });
  }
});
