/// <reference types="vite/client" />

// Allow CSS side-effect imports
declare module "*.css" {
  const content: string;
  export default content;
}

// Allow ?raw CSS imports
declare module "*.css?raw" {
  const content: string;
  export default content;
}
