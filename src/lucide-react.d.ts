// lucide-react@1.x ships .d.ts files but its package.json lacks a "types"
// field (and an "exports" map), so TypeScript's bundler resolution falls
// back to the JS entry and reports TS7016 (implicit any) for every import.
// Re-export the shipped declarations to restore full icon typing.
declare module "lucide-react" {
  export * from "lucide-react/dist/lucide-react";
}
