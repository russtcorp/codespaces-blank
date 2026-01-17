declare module "@resvg/resvg-wasm" {
  const initWasm: (module: WebAssembly.Module | ArrayBuffer | Uint8Array) => Promise<void>;
  class Resvg {
    constructor(svg: string, opts?: any);
    render(): { asPng(): Uint8Array };
  }
  export default initWasm;
  export { Resvg };
}
