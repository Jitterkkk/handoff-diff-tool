export type DiffType =
  | 'COLOR'
  | 'SIZE'
  | 'TYPOGRAPHY'
  | 'CONTENT'
  | 'ADDED'
  | 'REMOVED'
  | 'COMPONENT';

export type Severity = 'high' | 'medium' | 'low';

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type SerializablePaint =
  | { type: 'SOLID'; color: RGBA; visible: boolean; opacity: number }
  | { type: 'IMAGE'; visible: boolean; opacity: number }
  | {
      type:
        | 'GRADIENT_LINEAR'
        | 'GRADIENT_RADIAL'
        | 'GRADIENT_ANGULAR'
        | 'GRADIENT_DIAMOND';
      visible: boolean;
      opacity: number;
    }
  | { type: string; visible: boolean; opacity: number };

export interface SerializableEffect {
  type: string;
  visible: boolean;
  radius?: number;
  color?: RGBA;
}

export interface NodeSnapshot {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fills: SerializablePaint[];
  strokes: SerializablePaint[];
  effects: SerializableEffect[];
  opacity: number;
  visible: boolean;
  characters?: string;
  fontSize?: number;
  componentId?: string;
  children: NodeSnapshot[];
}

export interface DiffResult {
  nodeId: string;
  nodeName: string;
  type: DiffType;
  before: unknown;
  after: unknown;
  severity: Severity;
}

export interface SnapshotRecord {
  frameId: string;
  frameName: string;
  snapshot: NodeSnapshot;
  savedAt: number;
}

// UI → Plugin
export type UIToPluginMessage =
  | { type: 'GET_CURRENT_FRAME' }
  | { type: 'SAVE_SNAPSHOT'; frameId: string }
  | { type: 'GET_DIFF'; frameId: string }
  | { type: 'ZOOM_TO_NODE'; nodeId: string };

// Plugin → UI
export type PluginToUIMessage =
  | { type: 'CURRENT_FRAME'; frameId: string; frameName: string }
  | { type: 'NO_FRAME_SELECTED' }
  | { type: 'SNAPSHOT_SAVED'; frameId: string; frameName: string; savedAt: number }
  | { type: 'DIFF_RESULT'; diffs: DiffResult[]; frameId: string; savedAt: number }
  | { type: 'NO_PREVIOUS_SNAPSHOT' }
  | { type: 'ERROR'; message: string };
