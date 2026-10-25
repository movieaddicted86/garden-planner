import { assertFinitePoints } from '../geometry/assert-finite-points.js';
import type { Point } from '../geometry/point.js';
import type { LengthUnit } from '../units/length-unit.js';
import type { BaseArea, Project, Zone } from './project.js';
import { SCHEMA_VERSION } from './schema-version.js';
import { isZoneType, type ZoneType } from './zone-type.js';

/** The unit a new project displays in when the caller does not name one (D2). */
const DEFAULT_DISPLAY_UNIT: LengthUnit = 'm';

/** The least a zone outline can be (D3): a closed polygon is not part of the model. Also the floor the zone-edit operations keep. */
export const MIN_VERTICES = 3;

/**
 * A vertex copy. `Point` is readonly for the type system, not at runtime: without the copy a caller that keeps
 * a mutable alias of its array could move a vertex of an already constructed zone.
 */
function copyVertex(point: Point): Point {
  return { x: point.x, y: point.y };
}

/** Copies the vertices only – used where the polygon rules are already guaranteed by a `BaseArea` (see below). */
function copyPoints(points: readonly Point[]): readonly Point[] {
  return points.map(copyVertex);
}

/**
 * Copies the vertices and enforces the polygon rules a constructor can check on its own: at least three
 * vertices (D3) with finite coordinates. Self-intersection is **not** judged here — that is `validatePolygon`
 * (D5), and a bow tie has to be storable so the UI can mark it invalid instead of refusing the input.
 */
function copyPolygonPoints(points: readonly Point[], caller: string): readonly Point[] {
  if (points.length < MIN_VERTICES) {
    throw new RangeError(`${caller}: a polygon needs at least ${MIN_VERTICES} vertices, got ${points.length}`);
  }
  assertFinitePoints(points, caller);
  return copyPoints(points);
}

/** Ids and names are opaque text for the model, but an empty one is a caller bug (D11: no id generation here). */
function assertNotEmpty(value: string, caller: string, field: string): void {
  if (value.length === 0) {
    throw new RangeError(`${caller}: ${field} must not be empty`);
  }
}

/** `width` or `height` of a rectangle: finite and greater than zero, anything else is not a rectangle. */
function assertPositiveSize(value: number, caller: string, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${caller}: ${field} must be finite and greater than 0, got ${value}`);
  }
}

/**
 * A rectangle base area with its bottom-left corner at the origin, in plan orientation (D1): the vertices run
 * `(0,0) → (width,0) → (width,height) → (0,height)`, that is clockwise with y downwards.
 */
export function createRectangleBaseArea(width: number, height: number): BaseArea {
  assertPositiveSize(width, 'createRectangleBaseArea', 'width');
  assertPositiveSize(height, 'createRectangleBaseArea', 'height');
  return {
    points: [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ],
  };
}

/** A base area from drawn vertices. The caller's array and vertices are copied, not referenced. */
export function createPolygonBaseArea(points: readonly Point[]): BaseArea {
  return { points: copyPolygonPoints(points, 'createPolygonBaseArea') };
}

/** What a caller has to supply for a new zone; the id comes from outside (D11). */
export interface CreateZoneInput {
  readonly id: string;
  readonly type: ZoneType;
  readonly points: readonly Point[];
  readonly name?: string;
}

/**
 * A zone of `type` with all edges taking part in the edging (D10: the user switches single edges off).
 * The name falls back to the type, so a new zone is never unnamed in the plan.
 */
export function createZone(input: CreateZoneInput): Zone {
  assertNotEmpty(input.id, 'createZone', 'id');
  if (!isZoneType(input.type)) {
    throw new RangeError(`createZone: unknown zone type ${String(input.type)}`);
  }

  const points = copyPolygonPoints(input.points, 'createZone');
  return {
    id: input.id,
    name: input.name ?? input.type,
    type: input.type,
    points,
    edging: points.map(() => true),
  };
}

/** What a caller has to supply for a new project; the id comes from outside (D11, D13). */
export interface CreateProjectInput {
  readonly id: string;
  readonly name: string;
  readonly baseArea: BaseArea;
  readonly displayUnit?: LengthUnit;
}

/**
 * An empty project of the current format (D12). `baseArea` is copied, so a caller cannot mutate the project
 * through its own object, but its vertices are **not** re-judged: a `BaseArea` is built by the two constructors
 * above, which already enforce the polygon rules, and the stored file is validated by the persistence task's
 * schema (D12). Only `id` and `name` are checked here, as the task requires.
 */
export function createProject(input: CreateProjectInput): Project {
  assertNotEmpty(input.id, 'createProject', 'id');
  assertNotEmpty(input.name, 'createProject', 'name');
  return {
    schemaVersion: SCHEMA_VERSION,
    id: input.id,
    name: input.name,
    displayUnit: input.displayUnit ?? DEFAULT_DISPLAY_UNIT,
    baseArea: { points: copyPoints(input.baseArea.points) },
    zones: [],
  };
}

/** The project with `zone` appended, as a new project: the caller's project is left untouched. */
export function addZone(project: Project, zone: Zone): Project {
  if (project.zones.some((existing) => existing.id === zone.id)) {
    throw new RangeError(`addZone: project ${project.id} already has a zone with id ${zone.id}`);
  }
  return { ...project, zones: [...project.zones, zone] };
}
