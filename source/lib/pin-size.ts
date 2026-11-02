// Browser pinch zoom also scales CSS pixels. Counter-scale the marker only on touch screens.
export function pinScale(visualScale:number,touch:boolean){return touch?1/Math.max(1,Number.isFinite(visualScale)?visualScale:1):1;}
