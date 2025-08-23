// types.ts

export type DataPoint = {
    value: number; // numeric value from Arduino sensors
    label: string; // user-provided context
};

export type ExplorationKind =
    | "binning"
    | "labelMeans"
    | "extremes"
    | "delta"
    | "trend"
    | "frequency";

export type MappingKind =
    | "audio_pitch"
    | "audio_timbre"
    | "audio_rhythm"
    | "haptic_strength"
    | "haptic_pattern"
    | "haptic_repeat";
