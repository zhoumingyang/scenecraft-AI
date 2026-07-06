export type EditorGroupJSON = {
  id: string;
  label?: string;
  children: string[];
  locked?: boolean;
  visible?: boolean;
  position?: number[];
  quaternion?: number[];
  scale?: number[];
};
