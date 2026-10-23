# UAT - golden case: the real front garden

Acceptance test of the MVP. The golden case is the decider's real front garden, planned in the app and
compared with the quantities that were actually used. **All `TBD` values are placeholders; the decider supplies
them.** The lead asks for them actively before the first M3 task is released (see `.ai/PROJECT.md`).

**Acceptance:** for every line in section 5 the app result is within **+-10 %** of the real quantity.

Numbers in this file are plain data (metres, tonnes, pieces); the app is configured with the layer build-ups and
assumptions of section 3 and 4, not with its defaults, wherever they differ.

## 1. Base area

| Item                               | Value                                  |
| ---------------------------------- | -------------------------------------- |
| Shape                              | TBD (rectangle / polygon)              |
| Corner coordinates or edge lengths | TBD (m)                                |
| Measured area (reference)          | TBD m2                                 |
| Source of the measurements         | TBD (tape measure / survey plan / ...) |

## 2. Zones

| ID  | Zone                              | Type       | Outline (vertex coordinates in m, or edge lengths) | Reference area | Edging edges              |
| --- | --------------------------------- | ---------- | -------------------------------------------------- | -------------- | ------------------------- |
| Z1  | Path (polygonal slabs)            | `path`     | TBD                                                | TBD m2         | TBD (which edges, if any) |
| Z2  | Seating area (polygonal slabs)    | `patio`    | TBD                                                | TBD m2         | TBD                       |
| Z3  | Bed(s) with stone edging          | `bed`      | TBD (one row per bed)                              | TBD m2         | TBD (all edges / which)   |
| Z4  | Tree pit, ginkgo                  | `tree_pit` | TBD                                                | TBD m2         | TBD                       |
| Z5  | further zones (gravel, lawn, ...) | TBD        | TBD                                                | TBD m2         | TBD                       |

## 3. Layer build-up per zone (as actually built)

| Zone | Layer (top to bottom)               | Material            | Thickness | Bulk density | Waste | Note |
| ---- | ----------------------------------- | ------------------- | --------- | ------------ | ----- | ---- |
| Z1   | Slabs                               | polygonal slabs     | TBD cm    | -            | TBD % | TBD  |
| Z1   | Bedding                             | TBD (grit)          | TBD cm    | TBD t/m3     | -     | TBD  |
| Z1   | Base course                         | TBD (crushed stone) | TBD cm    | TBD t/m3     | -     | TBD  |
| Z2   | (same structure as Z1, if so state) | TBD                 | TBD       | TBD          | TBD   | TBD  |
| Z3   | TBD (soil / mulch / ...)            | TBD                 | TBD cm    | TBD t/m3     | -     | TBD  |
| Z4   | TBD                                 | TBD                 | TBD cm    | TBD t/m3     | -     | TBD  |

## 4. Assumptions used for the comparison

| Assumption            | App default | Value used in the real build |
| --------------------- | ----------- | ---------------------------- |
| Slab waste            | 10 %        | TBD                          |
| Bulk density          | 1.6 t/m3    | TBD (per material)           |
| Edging: edges counted | all edges   | TBD                          |

## 5. Real quantities vs. app result

"Real" = delivered/used quantity (delivery notes, receipts). "App" = filled in when the golden case has been
entered into the app. Deviation = (App - Real) / Real.

| Line | Material / quantity         | Unit | Real | App | Deviation | Within +-10 % |
| ---- | --------------------------- | ---- | ---- | --- | --------- | ------------- |
| Q1   | Polygonal slabs, Z1 + Z2    | m2   | TBD  |     |           |               |
| Q2   | Bedding material (grit)     | t    | TBD  |     |           |               |
| Q3   | Base course (crushed stone) | t    | TBD  |     |           |               |
| Q4   | Stone edging, beds          | lfm  | TBD  |     |           |               |
| Q5   | Tree pit material (ginkgo)  | TBD  | TBD  |     |           |               |
| Q6   | further lines               | TBD  | TBD  |     |           |               |

## 6. Procedure and result

1. Enter base area, zones and layer build-ups of sections 1-4 into the app (including the non-default assumptions).
2. Export the CSV material list and copy the totals into section 5.
3. Result (date, app version / commit, decider's verdict): TBD
