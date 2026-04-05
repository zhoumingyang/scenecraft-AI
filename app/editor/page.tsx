import EditorCanvasView from "@/components/editorCanvasView";
import { requireSessionUser } from "@/lib/server/auth/requireSessionUser";

export default async function EditorPage() {
  const user = await requireSessionUser();

  return <EditorCanvasView userEmail={user.email || null} />;
}
