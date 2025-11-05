export type PlotTrackKind = 'gc-content' | 'gc-skew' | 'coverage' | 'custom';

export interface PlotPoint {
  position: number;
  value: number;
}

export interface PlotTrack {
  id: string;
  name: string;
  kind: PlotTrackKind;
  color: string;
  points: PlotPoint[];
  visible: boolean;
  baseline?: number;
  axisMin?: number;
  axisMax?: number;
  source?: string;
  thicknessRatio?: number;
}

export type LinkTrackKind = 'alignment' | 'synteny' | 'custom';

export interface LinkConnection {
  sourceStart: number;
  sourceEnd: number;
  targetStart: number;
  targetEnd: number;
  value?: number;
  color?: string;
}

export interface LinkTrack {
  id: string;
  name: string;
  kind: LinkTrackKind;
  color: string;
  connections: LinkConnection[];
  visible: boolean;
  thicknessRatio?: number;
}

export interface VisualizationLayoutState {
  plotTracks: PlotTrack[];
  linkTracks: LinkTrack[];
}
