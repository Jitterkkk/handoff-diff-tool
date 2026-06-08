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
  entries: SnapshotEntry[];
}

export interface SnapshotEntryMeta {
  index: number;
  savedAt: number;
  label?: string;
}

export interface FrameMeta {
  id: string;
  name: string;
  historyEntries: SnapshotEntryMeta[];
}

// ─── Review flow ─────────────────────────────────────────────────────────────

export interface ReviewItem {
  diffResult: DiffResult;
  checkedAt: number | null;
  checkedBy: string | null;
}

export interface FrameReview {
  reviewId: string;
  frameId: string;
  frameName: string;
  publishedAt: number;
  publishedBy: string;
  description: string;
  items: ReviewItem[];
  status: 'pending' | 'in_progress' | 'done';
  backendReviewId?: string;
}

export interface ReviewSummary {
  frameId: string;
  frameName: string;
  reviewId: string;
  publishedAt: number;
  publishedBy: string;
  totalItems: number;
  pendingItems: number;
  status: 'pending' | 'in_progress' | 'done';
}

// UI → Plugin
export type UIToPluginMessage =
  | { type: 'GET_CURRENT_FRAME' }
  | { type: 'PUBLISH_REVIEW'; description: string; figmaFileUrl?: string }
  | { type: 'ZOOM_TO_NODE'; nodeId: string }
  | { type: 'CLEAR_HIGHLIGHTS' }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; includePosition: boolean }
  | { type: 'SAVE_FIGMA_URL'; figmaFileUrl: string }
  | { type: 'RESET_FRAME'; frameId: string };

// Plugin → UI
export type PluginToUIMessage =
  | { type: 'AUTH_STATUS'; authenticated: boolean; userName: string | null }
  | { type: 'CURRENT_FRAMES'; frames: FrameMeta[]; sessionStart: number }
  | { type: 'NO_FRAME_SELECTED' }
  | { type: 'SNAPSHOT_SAVED'; frames: FrameMeta[] }
  | { type: 'REVIEW_PUBLISHED'; synced: boolean; review: FrameReview; frames: FrameMeta[] }
  | { type: 'REVIEW_PUBLISHED'; synced: false; reason: 'no_changes' }
  | { type: 'NO_PREVIOUS_SNAPSHOT' }
  | { type: 'SETTINGS'; includePosition: boolean; figmaFileUrl?: string }
  | { type: 'PUBLISH_STATUS'; message: string }
  | { type: 'FRAME_RESET'; frameId: string }
  | { type: 'ERROR'; message: string };
