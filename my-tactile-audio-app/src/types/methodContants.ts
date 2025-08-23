// constants.ts
import { MappingKind } from "./methodTypes";

export const options: [MappingKind, string][] = [
    ["audio_pitch", "소리-높낮이"],
    ["audio_timbre", "소리-음색"],
    ["audio_rhythm", "소리-리듬"],
    ["haptic_strength", "진동-강도"],
    ["haptic_pattern", "진동-패턴"],
    ["haptic_repeat", "진동-반복"],
];
