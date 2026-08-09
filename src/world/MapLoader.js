import { ASSET_PATHS } from '../core/AssetLoader.js';
import { buildTestArena, buildThunderstrike } from './TestArena.js?v=20260823';

/**
 * Attempts to load a real multiplayer map (multiplayer-map-assets/<mapId>/map.glb).
 * Until real maps exist, always falls back to the procedural TestArena so
 * the game stays playable. Once you add a map, drop it at:
 *   multiplayer-map-assets/<mapId>/map.glb
 * and it will be used automatically.
 */
export async function loadMap(scene, assetLoader, mapId = 'downtown', worldSeed = 77129) {
  if (mapId === 'thunderstrike') return buildThunderstrike(scene, worldSeed);
  const path = `${ASSET_PATHS.multiplayerMaps}${mapId}/map.glb`;
  const model = await assetLoader.loadModel(path, null);

  if (model && model.children.length > 0) {
    scene.add(model);
    // Real maps are expected to tag spawn points / collision meshes via
    // userData set in the DCC tool (Blender custom properties export to glTF extras).
    return { group: model, dummies: [], spawnPoints: [{ x: 0, y: 1.7, z: 0 }], collisionBoxes: [] };
  }

  console.info(`[MapLoader] "${mapId}" not found in multiplayer-map-assets — using TestArena.`);
  return buildTestArena(scene);
}
