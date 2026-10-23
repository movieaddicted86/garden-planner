/**
 * The length units of the input/display boundary (D1, D2). Stored values are always metres; the unit only
 * decides how a value is shown and how typed input is interpreted.
 */
export type LengthUnit = 'm' | 'cm';

/**
 * The only place the display decimals are written down (D2): metres with 2, centimetres with 0 decimals.
 * Formatting reads them from here, so display and export cannot drift apart.
 */
export const DISPLAY_DECIMALS: Readonly<Record<LengthUnit, number>> = { m: 2, cm: 0 };
