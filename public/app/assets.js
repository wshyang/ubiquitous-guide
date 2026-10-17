/**
 * Asset loading — manifests + images for every sprite/prop/backdrop used.
 * Everything is fetched over the public URL space (/sprites, /composites, /images).
 */
export async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image failed: ${url}`));
    img.src = url;
  });
}

function buildSpriteIndex(pieces) {
  const index = new Map();
  for (const p of pieces) {
    // name is `<class>-NN`; keep the padded suffix exactly as filed on disk.
    const suffix = p.name.slice(p.class.length + 1);
    index.set(`${p.class}-${suffix}`, p);
  }
  return index;
}

function preloadUrls(spriteManifest, compositeManifest, firstBackdrop) {
  const urls = new Set([firstBackdrop]);
  for (const p of spriteManifest.pieces) urls.add(p.url);
  for (const group of Object.values(compositeManifest.detail)) {
    for (const entry of Object.values(group)) {
      urls.add(entry.hull);
      if (entry.oar_sprite) urls.add(entry.oar_sprite);
      if (entry.paddle_sprite) urls.add(entry.paddle_sprite);
    }
  }
  return [...urls];
}

async function loadAll(urls, onProgress) {
  const images = new Map();
  let done = 0;
  await Promise.all(
    urls.map(async (url) => {
      images.set(url, await loadImage(url));
      done += 1;
      if (onProgress) onProgress(done, urls.length);
    }),
  );
  return images;
}

/** Load manifests and every image the scene may draw. */
export async function loadSceneAssets(config, onProgress) {
  const [spriteManifest, compositeManifest] = await Promise.all([
    loadJSON("/sprites/manifest.json"),
    loadJSON("/composites/manifest.json"),
  ]);
  const urls = preloadUrls(spriteManifest, compositeManifest, config.backdrops[0].url);
  const images = await loadAll(urls, onProgress);
  return { spriteManifest, compositeManifest, images, spriteIndex: buildSpriteIndex(spriteManifest.pieces) };
}

/** Lazy-load one extra image (e.g. a backdrop switched at runtime). */
export async function ensureImage(assets, url) {
  if (!assets.images.has(url)) assets.images.set(url, await loadImage(url));
  return assets.images.get(url);
}
