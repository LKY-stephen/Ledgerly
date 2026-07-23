import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "../..");
const cfoRoot = path.resolve(repoRoot, "..");
const alanRoot = path.join(cfoRoot, "alan-stickman-web-demo");
const sourceDir = path.join(alanRoot, "img/Blue");
const packPath = path.join(alanRoot, "packs/blue/pack.json");
const assetDir = path.join(appRoot, "assets/stickman/alan-blue");
const manifestPath = path.join(
  appRoot,
  "src/features/game/stickman/alan-blue-sprite-manifest.generated.ts",
);
const assetMapPath = path.join(
  appRoot,
  "src/features/game/stickman/alan-blue-sprite-assets.generated.ts",
);

const defaultFrameWidth = 128;
const defaultFrameHeight = 128;
const maxColumns = 16;

const actions = [
  {
    id: "stand",
    frames: ["stand01.png"],
    loop: "hold",
    durationMs: 1000,
    reducedMotionFrame: 0,
  },
  {
    id: "sit",
    frames: ["sit01.png"],
    loop: "hold",
    durationMs: 1000,
    reducedMotionFrame: 0,
  },
  {
    id: "look",
    frames: ["sit_up01.png"],
    loop: "hold",
    durationMs: 1000,
    reducedMotionFrame: 0,
  },
  {
    id: "dangle",
    frames: [
      "sit_legs_up01.png",
      "sit_legs_down01.png",
      "dangle01.png",
      "dangle02.png",
      "dangle03.png",
      "dangle04.png",
      "dangle05.png",
      "dangle06.png",
    ],
    loop: "loop",
    durationMs: 980,
    reducedMotionFrame: 0,
  },
  {
    id: "walkFloor",
    frames: range("walk", 1, 6),
    loop: "loop",
    durationMs: 560,
    reducedMotionFrame: 0,
  },
  {
    id: "runFloor",
    frames: range("run", 1, 11),
    loop: "loop",
    durationMs: 460,
    reducedMotionFrame: 0,
  },
  {
    id: "runFloorTerminal",
    frames: ["run12.png"],
    loop: "reserved",
    durationMs: 250,
    reducedMotionFrame: 0,
  },
  {
    id: "falling",
    frames: ["fall01.png"],
    loop: "hold",
    durationMs: 420,
    reducedMotionFrame: 0,
  },
  {
    id: "recoverFromFloor",
    frames: range("bounce", 1, 4),
    loop: "once",
    durationMs: 420,
    reducedMotionFrame: 3,
  },
  {
    id: "nudge",
    frames: range("pinch", 1, 7),
    loop: "once",
    durationMs: 420,
    reducedMotionFrame: 3,
  },
  {
    id: "dragged",
    frames: range("pinch", 1, 7),
    loop: "loop",
    durationMs: 620,
    reducedMotionFrame: 3,
    inventoryOwner: false,
  },
  {
    id: "holdWall",
    frames: ["hang01.png"],
    loop: "hold",
    durationMs: 1000,
    reducedMotionFrame: 0,
  },
  {
    id: "climbWall",
    frames: range("wall_climb", 1, 5),
    loop: "loop",
    durationMs: 680,
    reducedMotionFrame: 0,
  },
  {
    id: "holdCeiling",
    frames: ["swing01.png"],
    loop: "hold",
    durationMs: 1000,
    reducedMotionFrame: 0,
    inventoryOwner: false,
  },
  {
    id: "climbCeiling",
    frames: range("swing", 1, 8),
    loop: "loop",
    durationMs: 720,
    reducedMotionFrame: 0,
  },
  {
    id: "rest",
    frames: ["lay01.png", "couch01.png"],
    loop: "loop",
    durationMs: 1400,
    reducedMotionFrame: 0,
  },
  {
    id: "jump",
    frames: ["jump01.png"],
    loop: "hold",
    durationMs: 360,
    reducedMotionFrame: 0,
  },
  {
    id: "spawn",
    frames: ["shime1.png"],
    loop: "hold",
    durationMs: 360,
    reducedMotionFrame: 0,
  },
  {
    id: "tripRecover",
    frames: [...range("trip", 1, 6), ...range("pull_up", 1, 7)],
    loop: "once",
    durationMs: 1180,
    reducedMotionFrame: 12,
  },
  {
    id: "pullUp",
    frames: range("pull_up", 1, 7),
    loop: "once",
    durationMs: 720,
    reducedMotionFrame: 6,
    inventoryOwner: false,
  },
  {
    id: "hugging",
    frames: range("hugging_solid", 1, 8),
    loop: "loop",
    durationMs: 920,
    reducedMotionFrame: 0,
  },
  {
    id: "hugged",
    frames: range("hugged_solid", 1, 8),
    loop: "loop",
    durationMs: 920,
    reducedMotionFrame: 0,
  },
  {
    id: "celebrateDance",
    frames: range("dance", 1, 89),
    loop: "once",
    durationMs: 2600,
    reducedMotionFrame: 0,
  },
];

function range(prefix, start, end) {
  const width = end >= 10 ? 2 : 2;
  return Array.from({ length: end - start + 1 }, (_, index) => {
    const value = start + index;
    return `${prefix}${String(value).padStart(width, "0")}.png`;
  });
}

function readPackPoseMap() {
  const pack = JSON.parse(fs.readFileSync(packPath, "utf8"));
  const posesByImage = new Map();

  for (const action of Object.values(pack.actions)) {
    for (const animation of action.animations ?? []) {
      for (const pose of animation.poses ?? []) {
        if (!posesByImage.has(pose.image)) {
          posesByImage.set(pose.image, {
            anchorX: pose.anchorX,
            anchorY: pose.anchorY,
            velocityX: pose.velocityX,
            velocityY: pose.velocityY,
            duration: pose.duration,
          });
        }
      }
    }
  }

  return {
    sourceFiles: pack.spriteManifest.files,
    posesByImage,
  };
}

function ensureCleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

const pngCache = new Map();

function readPngFrame(filename) {
  const cached = pngCache.get(filename);
  if (cached) {
    return cached;
  }

  const sourcePath = path.join(sourceDir, filename);
  const png = PNG.sync.read(fs.readFileSync(sourcePath));

  pngCache.set(filename, png);
  return png;
}

function getActionFrameSize(action) {
  const size = action.frames.reduce(
    (current, filename) => {
      const frame = readPngFrame(filename);
      return {
        width: Math.max(current.width, frame.width),
        height: Math.max(current.height, frame.height),
      };
    },
    { width: defaultFrameWidth, height: defaultFrameHeight },
  );

  if (size.height !== defaultFrameHeight) {
    throw new Error(
      `${action.id} has frame height ${size.height}; expected ${defaultFrameHeight}.`,
    );
  }

  return size;
}

function writeAtlas(action) {
  const frameSize = getActionFrameSize(action);
  const columns = Math.min(maxColumns, action.frames.length);
  const rows = Math.ceil(action.frames.length / columns);
  const atlas = new PNG({
    width: columns * frameSize.width,
    height: rows * frameSize.height,
  });

  action.frames.forEach((filename, index) => {
    const frame = readPngFrame(filename);
    const cellX = (index % columns) * frameSize.width;
    const cellY = Math.floor(index / columns) * frameSize.height;
    const offsetX = Math.round((frameSize.width - frame.width) / 2);
    const offsetY = Math.round((frameSize.height - frame.height) / 2);
    PNG.bitblt(
      frame,
      atlas,
      0,
      0,
      frame.width,
      frame.height,
      cellX + offsetX,
      cellY + offsetY,
    );
  });

  const atlasFilename = `${action.id}.png`;
  fs.writeFileSync(path.join(assetDir, atlasFilename), PNG.sync.write(atlas));

  return {
    atlasFilename,
    columns,
    frameSize,
    rows,
  };
}

function createSequence(action, atlas, posesByImage) {
  const firstPose = posesByImage.get(action.frames[0]);
  const firstFrame = readPngFrame(action.frames[0]);
  const firstOffsetX = Math.round((atlas.frameSize.width - firstFrame.width) / 2);
  const firstOffsetY = Math.round((atlas.frameSize.height - firstFrame.height) / 2);
  const velocity = inferVelocity(action, posesByImage);
  const anchor = firstPose
    ? {
        x: firstPose.anchorX + firstOffsetX,
        y: firstPose.anchorY + firstOffsetY,
      }
    : { x: 64, y: 128 };

  return {
    id: action.id,
    atlas: atlas.atlasFilename,
    frameCount: action.frames.length,
    frameSize: atlas.frameSize,
    columns: atlas.columns,
    rows: atlas.rows,
    anchor,
    durationMs: action.durationMs,
    velocity,
    loop: action.loop,
    reducedMotionFrame: action.reducedMotionFrame,
    frames: action.frames.map((source, index) => {
      const frame = readPngFrame(source);
      const offsetX = Math.round((atlas.frameSize.width - frame.width) / 2);
      const offsetY = Math.round((atlas.frameSize.height - frame.height) / 2);
      const pose = posesByImage.get(source) ?? {
        anchorX: anchor.x,
        anchorY: anchor.y,
        velocityX: velocity.x,
        velocityY: velocity.y,
        duration: 250,
      };

      return {
        source,
        actionId: action.id,
        atlasIndex: index,
        atlasX: (index % atlas.columns) * atlas.frameSize.width,
        atlasY: Math.floor(index / atlas.columns) * atlas.frameSize.height,
        anchor: { x: pose.anchorX + offsetX, y: pose.anchorY + offsetY },
        velocity: { x: pose.velocityX, y: pose.velocityY },
        duration: pose.duration,
      };
    }),
  };
}

function inferVelocity(action, posesByImage) {
  const poses = action.frames
    .map((filename) => posesByImage.get(filename))
    .filter(Boolean);
  const nonZero = poses.find(
    (pose) => pose.velocityX !== 0 || pose.velocityY !== 0,
  );

  if (nonZero) {
    return { x: nonZero.velocityX, y: nonZero.velocityY };
  }

  return { x: 0, y: 0 };
}

function getInventory(actionsToWrite) {
  const inventory = [];

  for (const action of actionsToWrite) {
    if (action.inventoryOwner === false) {
      continue;
    }

    action.frames.forEach((source, frameIndex) => {
      inventory.push({
        source,
        actionId: action.id,
        frameIndex,
      });
    });
  }

  return inventory;
}

function validate({ inventory, sourceFiles }) {
  const sourceSet = new Set(sourceFiles);
  const inventorySources = inventory.map((frame) => frame.source);
  const inventorySet = new Set(inventorySources);

  for (const action of actions) {
    for (const frame of action.frames) {
      if (!sourceSet.has(frame)) {
        throw new Error(`Action ${action.id} references missing source frame ${frame}.`);
      }
    }
  }

  if (sourceFiles.length !== 177) {
    throw new Error(`Expected 177 Alan Blue source frames, found ${sourceFiles.length}.`);
  }

  if (inventory.length !== sourceFiles.length) {
    throw new Error(
      `Expected inventory to contain ${sourceFiles.length} frames, found ${inventory.length}.`,
    );
  }

  for (const frame of sourceFiles) {
    if (!inventorySet.has(frame)) {
      throw new Error(`Source frame ${frame} is missing from the unique inventory.`);
    }
  }

  for (const frame of inventorySources) {
    if (inventorySources.indexOf(frame) !== inventorySources.lastIndexOf(frame)) {
      throw new Error(`Source frame ${frame} appears more than once in the inventory.`);
    }
  }
}

function toTs(value) {
  return JSON.stringify(value, null, 2).replace(/"([^"]+)":/g, "$1:");
}

function writeManifest(sequences, inventory) {
  const actionIds = actions.map((action) => action.id);
  const source = `// This file is generated by apps/mobile/scripts/generate-alan-stickman-atlases.mjs.\n// Do not edit by hand.\n\nexport const stickmanSpriteActionIds = ${toTs(actionIds)} as const;\n\nexport type StickmanSpriteActionId = (typeof stickmanSpriteActionIds)[number];\n\nexport type StickmanSpriteLoopMode = \"hold\" | \"loop\" | \"once\" | \"reserved\";\n\nexport interface StickmanSpritePoint {\n  x: number;\n  y: number;\n}\n\nexport interface StickmanSpriteFrame {\n  source: string;\n  actionId: StickmanSpriteActionId;\n  atlasIndex: number;\n  atlasX: number;\n  atlasY: number;\n  anchor: StickmanSpritePoint;\n  velocity: StickmanSpritePoint;\n  duration: number;\n}\n\nexport interface StickmanSpriteSequence {\n  id: StickmanSpriteActionId;\n  atlas: string;\n  frameCount: number;\n  frameSize: {\n    width: number;\n    height: number;\n  };\n  columns: number;\n  rows: number;\n  anchor: StickmanSpritePoint;\n  durationMs: number;\n  velocity: StickmanSpritePoint;\n  loop: StickmanSpriteLoopMode;\n  reducedMotionFrame: number;\n  frames: readonly StickmanSpriteFrame[];\n}\n\nexport interface StickmanMovementProfile {\n  actionId: StickmanSpriteActionId;\n  durationMs: number;\n  frameIntervalMs: number;\n  velocityX: number;\n  velocityY: number;\n  scaledVelocityX: number;\n  scaledVelocityY: number;\n  loop: StickmanSpriteLoopMode;\n  shouldAnimate: boolean;\n  reducedMotionFrame: number;\n}\n\nexport const alanBlueSpriteSource = {\n  sourceDir: ${JSON.stringify(sourceDir)},\n  relativeSourceDir: \"../alan-stickman-web-demo/img/Blue\",\n  packPath: ${JSON.stringify(packPath)},\n  relativePackPath: \"../alan-stickman-web-demo/packs/blue/pack.json\",\n  totalSourceFrames: 177,\n} as const;\n\nexport const alanBlueFrameInventory = ${toTs(inventory)} as const;\n\nexport const alanBlueSpriteSequences = ${toTs(sequences)} as const satisfies Record<StickmanSpriteActionId, StickmanSpriteSequence>;\n`;

  fs.writeFileSync(manifestPath, source);
}

function writeAssetMap() {
  const imports = actions
    .map((action) => {
      const name = `${action.id}Atlas`;
      return `import ${name} from "../../../../assets/stickman/alan-blue/${action.id}.png";`;
    })
    .join("\n");
  const entries = actions
    .map((action) => `  ${action.id}: ${action.id}Atlas,`)
    .join("\n");
  const source = `// This file is generated by apps/mobile/scripts/generate-alan-stickman-atlases.mjs.\n// Do not edit by hand.\n\nimport type { ImageSourcePropType } from "react-native";\n${imports}\nimport type { StickmanSpriteActionId } from "./alan-blue-sprite-manifest.generated";\n\nexport const alanBlueAtlasSources = {\n${entries}\n} satisfies Record<StickmanSpriteActionId, ImageSourcePropType>;\n`;

  fs.writeFileSync(assetMapPath, source);
}

function main() {
  const { sourceFiles, posesByImage } = readPackPoseMap();
  const existingPngs = fs
    .readdirSync(sourceDir)
    .filter((filename) => filename.endsWith(".png"))
    .sort();

  if (existingPngs.length !== sourceFiles.length) {
    throw new Error(
      `Source directory has ${existingPngs.length} PNGs, pack manifest has ${sourceFiles.length}.`,
    );
  }

  ensureCleanDir(assetDir);

  const sequences = {};
  for (const action of actions) {
    const atlas = writeAtlas(action);
    sequences[action.id] = createSequence(action, atlas, posesByImage);
  }

  const inventory = getInventory(actions);
  validate({ inventory, sourceFiles });
  writeManifest(sequences, inventory);
  writeAssetMap();

  console.log(
    `Generated ${actions.length} Alan Blue atlases and ${inventory.length} unique frame mappings.`,
  );
}

main();
