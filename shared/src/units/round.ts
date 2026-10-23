/**
 * Internal rounding helpers of the units area. They are deliberately not re-exported from the package index:
 * rounding is a display concern (D2) and no caller outside the formatting code needs it.
 */

/**
 * Removes the noise a multiplication or division leaves behind: `0.004 * 100` is `0.4000000000000001`,
 * twelve significant digits turn it back into `0.4`. Twelve is enough for every value this app handles
 * (metres with two decimals) and far above the ~15 digits where a double starts to wobble.
 */
export function snapToTwelveDigits(value: number): number {
  return Number(value.toPrecision(12));
}

/**
 * Rounds half **away from zero** to `decimals` places, after the same twelve-digit snap.
 * `(1.005, 2)` is `1.01` (plain `toFixed` gives `1.00`) and `(-0.125, 2)` is `-0.13` (plain `Math.round`
 * would give `-0.12`). A result of `-0` becomes `0`, so nothing ever displays as `-0.00`.
 */
export function roundHalfAwayFromZero(value: number, decimals: number): number {
  const scaled = snapToTwelveDigits(value * 10 ** decimals);
  const rounded = Math.sign(scaled) * Math.round(Math.abs(scaled));
  if (rounded === 0) {
    return 0;
  }
  return snapToTwelveDigits(rounded / 10 ** decimals);
}
