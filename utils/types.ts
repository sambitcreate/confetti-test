export interface Point {
    x: number;
    y: number;
}

export interface HandInputData {
    cursor: Point;
    isPinching: boolean;
    isDetected: boolean;
}

export interface AssetMap {
    [key: string]: HTMLImageElement;
}

export const PRELOAD_IMAGES_SRC = [
    { key: "combo", src: "https://assets.codepen.io/16327/3D-combo.png" },
    { key: "cone", src: "https://assets.codepen.io/16327/3D-cone.png" },
    { key: "hoop", src: "https://assets.codepen.io/16327/3D-hoop.png" },
    { key: "keyframe", src: "https://assets.codepen.io/16327/3D-keyframe.png" },
    { key: "semi", src: "https://assets.codepen.io/16327/3D-semi.png" },
    { key: "spiral", src: "https://assets.codepen.io/16327/3D-spiral.png" },
    { key: "squish", src: "https://assets.codepen.io/16327/3D-squish.png" },
    { key: "triangle", src: "https://assets.codepen.io/16327/3D-triangle.png" },
    { key: "tunnel", src: "https://assets.codepen.io/16327/3D-tunnel.png" },
    { key: "wat", src: "https://assets.codepen.io/16327/3D-poly.png" },
];

export const EXPLOSION_IMAGES_SRC = [
    { key: "blue-circle", src: "https://assets.codepen.io/16327/2D-circles.png" },
    { key: "green-keyframe", src: "https://assets.codepen.io/16327/2D-keyframe.png" },
    { key: "orange-lightning", src: "https://assets.codepen.io/16327/2D-lightning.png" },
    { key: "orange-star", src: "https://assets.codepen.io/16327/2D-star.png" },
    { key: "purple-flower", src: "https://assets.codepen.io/16327/2D-flower.png" },
    { key: "cone", src: "https://assets.codepen.io/16327/3D-cone.png" },
    { key: "keyframe", src: "https://assets.codepen.io/16327/3D-spiral.png" },
    { key: "spiral", src: "https://assets.codepen.io/16327/3D-spiral.png" },
    { key: "tunnel", src: "https://assets.codepen.io/16327/3D-tunnel.png" },
    { key: "hoop", src: "https://assets.codepen.io/16327/3D-hoop.png" },
    { key: "semi", src: "https://assets.codepen.io/16327/3D-semi.png" },
];