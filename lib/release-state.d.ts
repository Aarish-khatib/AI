export type ReleaseFeatureName =
  | "coreChat"
  | "mediaStudio"
  | "imageEditor"
  | "videoEditor"
  | "atomicCloudSync"
  | "providerKeyPool"
  | "appBuilder"
  | "providerMarketplace"
  | "remoteDesktop"
  | "officeArtifacts"
  | "documentStudio"
  | "intelligenceHub"
  | "securityCentre";
export declare const RELEASE_FEATURES: Readonly<
  Record<ReleaseFeatureName, { ready: boolean; enabledByDefault: boolean }>
>;
export declare function resolveReleaseFeature(
  name: ReleaseFeatureName | string,
  explicitValue?: string,
): boolean;
export declare function redactDiagnostics<T>(value: T): T;
export declare function releaseFeatureSnapshot(
  environment?: Record<string, string | undefined>,
): Record<string, boolean>;
