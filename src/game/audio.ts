type Cue = "click" | "hit" | "heal" | "win" | "lose" | "encounter";

let context: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!context) context = new Ctx();
  if (context.state === "suspended") void context.resume();
  return context;
}

export function playCue(cue: Cue, muted: boolean): void {
  if (muted) return;
  const audio = ctx();
  if (!audio) return;
  const now = audio.currentTime;
  const notes: number[] =
    cue === "win"
      ? [523, 659, 784]
      : cue === "lose"
        ? [311, 247]
        : cue === "encounter"
          ? [196, 247, 196]
          : cue === "heal"
            ? [494, 659]
            : cue === "hit"
              ? [180]
              : [660];
  notes.forEach((freq, index) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = cue === "hit" ? "triangle" : "sine";
    osc.frequency.value = freq;
    const start = now + index * 0.08;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(cue === "click" ? 0.03 : 0.05, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(start);
    osc.stop(start + 0.2);
  });
}
