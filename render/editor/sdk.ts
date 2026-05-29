import { createEditorApp, EditorApp, type EditorAppOptions } from "./app";

export type EditorSdk = EditorApp;

export function createEditorSdk(host: HTMLDivElement, options: EditorAppOptions = {}): EditorSdk {
  return createEditorApp(host, options);
}
