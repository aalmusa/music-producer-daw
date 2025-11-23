// Ambient module declarations for Essentia.js

declare module "essentia.js/dist/essentia.js-core.es" {
  const Essentia: any;
  export default Essentia;
}

declare module "essentia.js/dist/essentia-wasm.es" {
  // no default export, only a named export
  export const EssentiaWASM: any;
}

declare module "essentia.js/dist/essentia.js-extractor.es" {
  const EssentiaExtractor: any;
  export default EssentiaExtractor;
}

declare module "essentia.js/dist/essentia.js-model" {
  export * from "essentia.js/dist/machinelearning/index";
}

declare module "essentia.js/dist/essentia.js-model.es" {
  export * from "essentia.js/dist/machinelearning/index";
}

declare module "essentia.js/dist/machinelearning/index" {
  export { EssentiaTFInputExtractor } from "essentia.js/dist/machinelearning/tfjs_input_extractor";
  export {
    EssentiaTensorflowJSModel,
    TensorflowMusiCNN,
    TensorflowVGGish,
  } from "essentia.js/dist/machinelearning/tfjs_models";
}
