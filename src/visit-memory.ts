export const times = ['day', 'golden', 'twilight', 'night'] as const;
export type TimeOfDay = typeof times[number];
export const places = ['lookout', 'pond', 'porch', 'neptr'] as const;
export type Place = typeof places[number];
export interface VisitMemory { time: TimeOfDay; discovered: Place[] }
export function parseMemory(raw: string | null): VisitMemory {
  try {
    const value = JSON.parse(raw || '{}');
    return { time: times.includes(value?.time) ? value.time : 'twilight',
      discovered: Array.isArray(value?.discovered) ? places.filter(p => value.discovered.includes(p)) : [] };
  } catch { return { time: 'twilight', discovered: [] }; }
}
export function readStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function writeStorage(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* Memory is optional, even in private or restricted browsers. */ }
}
export const automaticPorch = (time: TimeOfDay) => time === 'twilight' || time === 'night';
