/// <reference types="vite/client" />

/** Perspective loads its WebAssembly workers through Vite asset URLs. */
declare module '*?url' {
  const assetUrl: string;
  export default assetUrl;
}
