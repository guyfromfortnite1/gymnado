const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const ftInToCm = (ft: number, inches: number) => (ft * 12 + inches) * CM_PER_IN;
export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const total = Math.round(cm / CM_PER_IN);
  return { ft: Math.floor(total / 12), inches: total % 12 };
}
