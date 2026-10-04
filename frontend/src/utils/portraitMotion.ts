/** Speech-driven approximation; browser TTS does not expose phoneme audio. */
export function mouthOpening(elapsedMs: number, boundaryAgeMs: number, speaking: boolean) {
  if (!speaking || elapsedMs < 0) return 0;
  // Legacy browser TTS has no accessible audio. Only react to actual boundary events.
  return boundaryAgeMs >= 0 && boundaryAgeMs < 160
    ? Math.sin((boundaryAgeMs / 160) * Math.PI) * 0.55 : 0;
}

// Each portrait has its own lip position and head angle.
export const portraitMouth = {
  female: { x: 0.501, y: 0.438, halfWidth: 0.039, angle: -0.14 },
  male: { x: 0.494, y: 0.449, halfWidth: 0.040, angle: -0.12 },
};
