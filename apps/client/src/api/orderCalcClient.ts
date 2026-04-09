// Client-side mirror of the server's orderCalc — used for live form previews.
// The server remains the source of truth; these values are display-only.

interface Packs {
  p1?: number;
  p2?: number;
  p3?: number;
  p4?: number;
  p5?: number;
  p6?: number;
}

export function calcTotalUnits(packs: Packs, units?: Packs): number {
  if (units) return calcManualUnits(units, packs);
  const p5 = packs.p5 ?? 0;
  return (packs.p1 ?? 0) * 1 + (packs.p2 ?? 0) * 2 + (packs.p3 ?? 0) * 3 + (packs.p4 ?? 0) * 4 + p5 * 5 + (packs.p6 ?? 0) * 6;
}

export function calcManualUnits(units?: Packs, fallbackPacks?: Packs): number {
  if (!units) return fallbackPacks ? calcTotalUnits(fallbackPacks) : 0;
  return (
    (units.p1 ?? 0) * 1 +
    (units.p2 ?? 0) * 2 +
    (units.p3 ?? 0) * 3 +
    (units.p4 ?? 0) * 4 +
    (units.p5 ?? 0) * 5 +
    (units.p6 ?? 0) * 6
  );
}

export function calcPackBoxes(packs: Packs): number {
  const p5 = packs.p5 ?? 0;
  return (packs.p1 ?? 0) + (packs.p2 ?? 0) + (packs.p3 ?? 0) + (packs.p4 ?? 0) + p5 + (packs.p6 ?? 0);
}

export function calcTotalBoxes(packs: Packs, totalBoxes?: number): number {
  return totalBoxes && totalBoxes > 0 ? totalBoxes : calcPackBoxes(packs);
}
