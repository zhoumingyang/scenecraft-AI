export type EditorLightJSON = {
  id: string;
  label?: string;
  type: number | string;
  locked?: boolean;
  visible?: boolean;
  position?: number[];
  quaternion?: number[];
  scale?: number[];
  color?: string;
  groundColor?: string;
  intensity?: number;
  distance?: number;
  decay?: number;
  angle?: number;
  penumbra?: number;
  width?: number;
  height?: number;
};
