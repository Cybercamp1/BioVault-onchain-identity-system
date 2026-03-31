export interface EEGSession {
  session_id: string;
  label: string;
  cognitive_state: string;
  duration_sec: number;
  sample_rate: number;
  channels: number;
  data: Record<string, number[]>;
}

export interface SessionRecord {
  cid: string;
  lit_hash: string;
  label: string;
  timestamp: number;
  cognitive_state: string;
}
