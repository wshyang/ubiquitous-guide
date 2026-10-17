/**
 * Loads the extracted sprite pieces, composite manifests and the backdrop from /assets.
 * Names are unique across the loaded sheets, so the library is a flat name lookup.
 */

export interface Sprite {
  readonly name: string;
  readonly image: HTMLImageElement;
  readonly width: number;
  readonly height: number;
  readonly anchors: Readonly<Record<string, readonly number[]>>;
}

export interface SpriteLibrary {
  readonly backdrop: HTMLImageElement;
  get(name: string): Sprite;
  has(name: string): boolean;
  namesWithPrefix(prefix: string): string[];
}

/** Size comes from the decoded image, because composite manifests do not record it. */
interface PieceEntry {
  name: string;
  file: string;
}

interface CompositeEntry extends PieceEntry {
  anchors: Record<string, number[]>;
}

const PIECE_SHEETS = ["/assets/sprites/kids", "/assets/sprites/boats", "/assets/sprites/clouds", "/assets/sprites/effects-props-v1"];
const COMPOSITE_SHEETS = ["/assets/composites/kayaks", "/assets/composites/dragon-boats"];
const BACKDROP_URL = "/assets/backdrops/kallang_purple_dusk.jpeg";

export async function loadSpriteLibrary(): Promise<SpriteLibrary> {
  const [backdrop, pieceSets, compositeSets] = await Promise.all([
    loadImage(BACKDROP_URL),
    Promise.all(PIECE_SHEETS.map((dir) => loadManifest<PieceEntry>(dir, "pieces"))),
    Promise.all(COMPOSITE_SHEETS.map((dir) => loadManifest<CompositeEntry>(dir, "composites"))),
  ]);
  const sprites = new Map<string, Sprite>();
  const pending: Promise<void>[] = [];
  pieceSets.forEach((entries, index) => pending.push(...addEntries(sprites, PIECE_SHEETS[index], entries)));
  compositeSets.forEach((entries, index) => pending.push(...addEntries(sprites, COMPOSITE_SHEETS[index], entries)));
  await Promise.all(pending);
  return buildLibrary(backdrop, sprites);
}

function buildLibrary(backdrop: HTMLImageElement, sprites: Map<string, Sprite>): SpriteLibrary {
  return {
    backdrop,
    get(name) {
      const sprite = sprites.get(name);
      if (!sprite) {
        throw new Error(`sprite not loaded: ${name}`);
      }
      return sprite;
    },
    has: (name) => sprites.has(name),
    namesWithPrefix: (prefix) => [...sprites.keys()].filter((name) => name.startsWith(prefix)).sort(),
  };
}

async function loadManifest<T extends PieceEntry>(dir: string, listKey: "pieces" | "composites"): Promise<T[]> {
  const response = await fetch(`${dir}/manifest.json`);
  if (!response.ok) {
    throw new Error(`manifest missing: ${dir}`);
  }
  const body = (await response.json()) as Record<string, T[]>;
  return body[listKey];
}

function addEntries(sprites: Map<string, Sprite>, dir: string, entries: PieceEntry[]): Promise<void>[] {
  return entries.map(async (entry) => {
    const anchors = (entry as Partial<CompositeEntry>).anchors ?? {};
    const image = await loadImage(`${dir}/${entry.file}`);
    sprites.set(entry.name, { name: entry.name, image, width: image.naturalWidth, height: image.naturalHeight, anchors });
  });
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`failed to load ${url}`));
    image.src = url;
  });
}

