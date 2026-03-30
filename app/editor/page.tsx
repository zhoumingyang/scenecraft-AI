import { headers } from "next/headers";
import { redirect } from "next/navigation";
import EditorCanvasView from "@/components/editorCanvasView";
import { auth } from "@/lib/auth";

export default async function EditorPage() {
  const sessionData = await auth.api.getSession({
    headers: await headers()
  });

  if (!sessionData) {
    redirect("/home");
  }

  return <EditorCanvasView />;
}
