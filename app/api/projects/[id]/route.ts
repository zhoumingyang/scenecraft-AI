import { NextResponse } from "next/server";
import type { SaveProjectRequest, SaveProjectResponse } from "@/lib/api/contracts/projects";
import { projectSaveRequestSchema } from "@/lib/project/schema";
import { getSession } from "@/lib/server/auth/getSession";
import { getErrorMessage } from "@/lib/server/http/getErrorMessage";
import { deleteProject, updateProject } from "@/lib/server/projects/mutations";
import { getProjectByIdForUser } from "@/lib/server/projects/queries";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

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
        aiSnapshot: project.aiSnapshot
      }
    });
  } catch (error) {
    const message = getErrorMessage(error, "Failed to load project.");
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const payload = projectSaveRequestSchema.parse((await request.json()) as SaveProjectRequest);

    if (payload.snapshot.id !== id) {
      return NextResponse.json(
        { message: "Snapshot id must match the project id in the URL." },
        { status: 400 }
      );
    }

    const existing = await getProjectByIdForUser(id, session.user.id);
    if (!existing) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }

    const updated = await updateProject({
      projectId: id,
      userId: session.user.id,
      payload
    });

    if (!updated) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }

    const response: SaveProjectResponse = {
      project: {
        id: updated.id,
        version: updated.version,
        updatedAt: updated.updatedAt.toISOString(),
        snapshot: updated.snapshot,
        aiSnapshot: updated.aiSnapshot
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = getErrorMessage(error, "Failed to update project.");
    const status = message.includes("DATABASE_URL") ? 500 : 400;
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const existing = await getProjectByIdForUser(id, session.user.id);
    if (!existing) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }

    const deleted = await deleteProject(id, session.user.id);
    if (!deleted) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = getErrorMessage(error, "Failed to delete project.");
    const status = message.includes("DATABASE_URL") ? 500 : 400;
    return NextResponse.json({ message }, { status });
  }
}
