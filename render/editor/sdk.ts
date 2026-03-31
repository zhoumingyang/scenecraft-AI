import { createEditorApp, EditorApp } from "./app";

export type EditorSdk = EditorApp;

export function createEditorSdk(host: HTMLDivElement): EditorSdk {
  return createEditorApp(host);
}
