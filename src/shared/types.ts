export type DiffType =
  | 'COLOR'
  | 'SIZE'
  | 'TYPOGRAPHY'
  | 'CONTENT'
  | 'ADDED'
  | 'REMOVED'
  | 'COMPONENT'
  | 'LAYOUT'
  | 'POSITION';

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

export interface AutoLayoutSnapshot {
  layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  itemSpacing: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  primaryAxisAlignItems: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN';
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
  autoLayout?: AutoLayoutSnapshot;
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

export interface SnapshotEntry {
  savedAt: number;
  label?: string;
  snapshot: NodeSnapshot;
}

export interface SnapshotHistory {
  frameId: string;
  frameName: string;
  entries: SnapshotEntry[]; // máx 5, índice 0 = mais antigo
}

// Metadados para a UI — sem o snapshot completo
export interface SnapshotEntryMeta {
  index: number;
  savedAt: number;
  label?: string;
}

// Frame com histórico — usado em mensagens plugin → UI
export interface FrameMeta {
  id: string;
  name: string;
  historyEntries: SnapshotEntryMeta[];
}

// Diffs de um frame específico
export interface FrameDiffGroup {
  frameId: string;
  frameName: string;
  diffs: DiffResult[];
  savedAt: number;
}

// UI → Plugin
export type UIToPluginMessage =
  | { type: 'GET_CURRENT_FRAME' }
  | { type: 'GET_DIFF'; entryIndex: number; includePosition: boolean }
  | { type: 'GENERATE_REPORT'; entryIndex: number; includePosition: boolean }
  | { type: 'ZOOM_TO_NODE'; nodeId: string }
  | { type: 'CLEAR_HIGHLIGHTS' }
  | { type: 'EXPORT_DIFF'; frameDiffs: FrameDiffGroup[] }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; includePosition: boolean };

// Plugin → UI
export type PluginToUIMessage =
  | { type: 'CURRENT_FRAMES'; frames: FrameMeta[]; sessionStart: number }
  | { type: 'NO_FRAME_SELECTED' }
  | { type: 'SNAPSHOT_SAVED'; frames: FrameMeta[] }
  | { type: 'DIFF_RESULT'; frameDiffs: FrameDiffGroup[] }
  | { type: 'NO_PREVIOUS_SNAPSHOT' }
  | { type: 'DIFF_EXPORT'; json: string; fileName: string }
  | { type: 'REPORT_READY'; html: string; fileName: string }
  | { type: 'SETTINGS'; includePosition: boolean }
  | { type: 'ERROR'; message: string };
