import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addZone, createProject, createRectangleBaseArea, createZone, SCHEMA_VERSION, type Project } from '../index.js';

/** A small project with one zone, built through the factories. */
function sampleProject(): Project {
  const baseArea = createRectangleBaseArea(10, 4);
  const zone = createZone({
    id: 'z1',
    type: 'bed',
    points: [
      { x: 1, y: 1 },
      { x: 3, y: 1 },
      { x: 3, y: 2 },
    ],
  });
  return addZone(createProject({ id: 'p1', name: 'Front garden', baseArea }), zone);
}

test('a project survives a JSON round trip unchanged (AC-5)', () => {
  const project = sampleProject();
  const restored: Project = JSON.parse(JSON.stringify(project)) as Project;
  assert.deepEqual(restored, project);
  assert.deepEqual(restored.zones[0].edging, [true, true, true]);
});

test('a project is plain data, not a class instance (AC-5)', () => {
  const project = sampleProject();
  assert.equal(Object.getPrototypeOf(project), Object.prototype);
  assert.equal(Object.getPrototypeOf(project.baseArea), Object.prototype);
  assert.equal(Object.getPrototypeOf(project.zones[0]), Object.prototype);
  assert.equal(project.zones[0].points.length, 3);
});

test('a project carries the schema version and the display unit, nothing else (AC-5)', () => {
  const project = sampleProject();
  assert.deepEqual(Object.keys(project).sort(), ['baseArea', 'displayUnit', 'id', 'name', 'schemaVersion', 'zones']);
  assert.equal(project.schemaVersion, SCHEMA_VERSION);
  assert.equal(project.displayUnit, 'm');
});
