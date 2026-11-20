/**
 * DOMINO SKY - Map & Geometry Utilities
 * Accurately projects Indian airport coordinates and generates curved quadratic flight arcs.
 */

import { Airport } from '../data/loader';

export interface Point {
  x: number;
  y: number;
}

export const MAP_DIMENSIONS = {
  width: 620,
  height: 680,
  paddingX: 55,
  paddingY: 45,
  minLat: 7.5,
  maxLat: 32.5,
  minLng: 71.0,
  maxLng: 93.0,
};

export function projectLatLng(lat: number, lng: number): Point {
  const { width, height, paddingX, paddingY, minLat, maxLat, minLng, maxLng } = MAP_DIMENSIONS;

  const usableWidth = width - 2 * paddingX;
  const usableHeight = height - 2 * paddingY;

  const normX = (lng - minLng) / (maxLng - minLng);
  const normY = (lat - minLat) / (maxLat - minLat);

  const x = paddingX + normX * usableWidth;
  // In SVG, y=0 is top, so higher latitude (north) maps to lower y
  const y = height - paddingY - normY * usableHeight;

  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

/**
 * Generates an elegant quadratic bezier SVG path for a flight between two points
 * Arcs curve gracefully toward the center of the country
 */
export function getFlightArcPath(start: Point, end: Point, curveMultiplier: number = 0.22): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0) return '';

  // Midpoint
  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;

  // Normal vector perpendicular to flight path
  let nx = -dy / dist;
  let ny = dx / dist;

  // Adjust curvature orientation so arc bends nicely
  const curvature = Math.min(dist * curveMultiplier, 55);
  const cx = mx + nx * curvature;
  const cy = my + ny * curvature;

  return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
}

/**
 * Calculates current plane position along quadratic bezier at progress t (0 to 1)
 */
export function getPointOnArc(start: Point, end: Point, t: number, curveMultiplier: number = 0.22): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;
  const curvature = Math.min(dist * curveMultiplier, 55);
  const cx = mx + (-dy / dist) * curvature;
  const cy = my + (dx / dist) * curvature;

  // Quadratic Bezier formula: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
  const oneMinusT = 1 - t;
  const x = oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * cx + t * t * end.x;
  const y = oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * cy + t * t * end.y;

  return { x, y };
}
