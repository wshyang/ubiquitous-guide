// Anchor configurations for composite boat+oar objects
// Coordinates are percentages (0-1) relative to hull image bounding box
// Origin: top-left of hull image (as rendered)
// Anchor = pivot point where oar handle attaches to hull (oarlock)
// Measured via overlay experimentation (see docs/anchor-iterations.md)
// All values in % of hull width/height, allowing responsive scaling

export const DRAGON_ANCHORS = {
  // Hull dimensions: 1147x187 -> aspect used for %-calculation
  // For dragonboat-red as reference (all colours share same geometry)
  hull: {
    width: 1147,
    height: 187,
    // gunwale Y is ~ 55% from top (deck line where rowers sit)
    gunwaleY: 0.55,
  },
  // 10 rowers: 5 per side? But sprite shows all on one side (starboard) for pixel art clarity
  // Each oar pivots near the rower's hip/gunwale
  // X positions estimated via visual measurement, then refined via screenshot loop
  rowers: [
    // front to back (bow to stern) - drummer excluded (no oar)
    { id: 'r1', x: 0.22, y: 0.58, side: 'starboard', phase: 0.0 },
    { id: 'r2', x: 0.29, y: 0.58, side: 'starboard', phase: 0.15 },
    { id: 'r3', x: 0.36, y: 0.58, side: 'starboard', phase: 0.30 },
    { id: 'r4', x: 0.43, y: 0.58, side: 'starboard', phase: 0.45 },
    { id: 'r5', x: 0.50, y: 0.58, side: 'starboard', phase: 0.0 },
    { id: 'r6', x: 0.57, y: 0.58, side: 'starboard', phase: 0.15 },
    { id: 'r7', x: 0.64, y: 0.58, side: 'starboard', phase: 0.30 },
    { id: 'r8', x: 0.71, y: 0.58, side: 'starboard', phase: 0.45 },
    { id: 'r9', x: 0.78, y: 0.58, side: 'starboard', phase: 0.0 },
    { id: 'r10', x: 0.85, y: 0.58, side: 'starboard', phase: 0.15 },
  ],
  // Oar dimensions: 34x180 vertical oar image -> pivot at top handle (20% from top)
  // Transform origin for CSS rotation: top-center of oar image (handle)
  oar: {
    pivotX: 0.5, // center x
    pivotY: 0.15, // near handle top
    length: 180,
    width: 34,
  },
  // Animation: oar rotates around pivot, blade dips into water
  animation: {
    duration: 0.9, // seconds per stroke
    angleFrom: -28,
    angleTo: 32,
    stagger: 0.09, // seconds between rowers
  },
  // Drummer position (no oar, but for completeness)
  drummer: { x: 0.14, y: 0.45 },
};

export const KAYAK_ANCHORS = {
  K1: {
    hull: { width: 524, height: 125, cockpitY: 0.52 },
    // Single paddler centered in cockpit - double-ended paddle pivots at cockpit center
    // Paddle rotates around cockpit, blades alternate sides
    cockpit: { x: 0.50, y: 0.55 },
    paddle: {
      length: 178,
      width: 32,
      pivotX: 0.5,
      pivotY: 0.5, // center of paddle
    },
    animation: {
      duration: 0.6,
      angleFrom: -38,
      angleTo: 38,
    },
  },
  K2: {
    hull: { width: 538, height: 130 },
    cockpits: [
      { x: 0.32, y: 0.55, phase: 0.0 },
      { x: 0.68, y: 0.55, phase: 0.5 }, // 180 deg out of phase for alternating strokes
    ],
    paddle: { length: 178, width: 32, pivotX: 0.5, pivotY: 0.5 },
    animation: { duration: 0.6, angleFrom: -38, angleTo: 38, stagger: 0.3 },
  },
  K3: {
    hull: { width: 537, height: 127 },
    cockpits: [
      { x: 0.22, y: 0.55, phase: 0.0 },
      { x: 0.50, y: 0.55, phase: 0.33 },
      { x: 0.78, y: 0.55, phase: 0.66 },
    ],
    paddle: { length: 178, width: 32, pivotX: 0.5, pivotY: 0.5 },
    animation: { duration: 0.6, angleFrom: -38, angleTo: 38, stagger: 0.2 },
  },
  // For K4? We have orange K2 and peach K3 as extra variants sharing same geometry
  K2_orange: {
    hull: { width: 537, height: 128 },
    cockpits: [
      { x: 0.32, y: 0.55, phase: 0.0 },
      { x: 0.68, y: 0.55, phase: 0.5 },
    ],
    paddle: { length: 178, width: 32, pivotX: 0.5, pivotY: 0.5 },
    animation: { duration: 0.6, angleFrom: -38, angleTo: 38, stagger: 0.3 },
  },
};

// Generic helper to convert % anchors to pixel coords at render size
export function toPixels(percent, size) {
  return { x: percent.x * size.width, y: percent.y * size.height };
}

export const ALL_DRAGON_COLOURS = ['red','blue','green','yellow','orange','purple'];
export const ALL_KAYAK_VARIANTS = [
  { type: 'K1', colour: 'red',    file: 'kayak-k1-red-frame1' },
  { type: 'K1', colour: 'yellow', file: 'kayak-k1-yellow-frame1' },
  { type: 'K2', colour: 'green',  file: 'kayak-k2-green-frame1' },
  { type: 'K2', colour: 'blue',   file: 'kayak-k2-blue-frame1' },
  { type: 'K3', colour: 'purple', file: 'kayak-k3-purple-frame1' },
  { type: 'K2', colour: 'orange', file: 'kayak-k2-orange-frame1' },
];
