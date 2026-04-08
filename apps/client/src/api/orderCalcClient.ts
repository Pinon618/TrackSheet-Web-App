// Client-side mirror of the server's orderCalc — used for live form previews.
// The server remains the source of truth; these values are display-only.

interface Packs {
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p6: number;
}

export function calcTotalUnits(packs: Packs): number {
  return packs.p1 * 1 + packs.p2 * 2 + packs.p3 * 3 + packs.p4 * 4 + packs.p6 * 6;
}
