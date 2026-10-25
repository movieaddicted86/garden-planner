import type { Point } from '../geometry/point.js';
import type { LengthUnit } from '../units/length-unit.js';
import type { ZoneType } from './zone-type.js';

/**
 * The garden outline the zones live in (D6). A pure addition in the first version, so it is the same polygon
 * type as a zone: an ordered vertex list without a repeated closing vertex (D3), coordinates in metres (D1).
 */
export interface BaseArea {
  readonly points: readonly Point[];
}

/** A drawn, typed part of the garden (D7). */
export interface Zone {
  readonly id: string;
  readonly name: string;
  readonly type: ZoneType;
  readonly points: readonly Point[];
  /** edging[i] = edge i takes part in the edging; always `points.length` entries (D4, D10) */
  readonly edging: readonly boolean[];
}

/**
 * Everything a stored project holds (D12). Plain JSON data: no class, no `Date`, no optional field — the file
 * format and the type have to be the same shape, or a saved project cannot be read back without guessing.
 * Layers, materials and their assumptions are added by M2 together with a `schemaVersion` change and a
 * migration; they are deliberately not part of this shape yet.
 */
export interface Project {
  readonly schemaVersion: number;
  readonly id: string;
  readonly name: string;
  readonly displayUnit: LengthUnit;
  readonly baseArea: BaseArea;
  readonly zones: readonly Zone[];
}
