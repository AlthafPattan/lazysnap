import type { LazysnapConnectionInfo } from "../types.js";

/**
 * Captures current network connection info via the Network Information API.
 * Gracefully degrades — all fields are undefined in unsupported browsers.
 *
 * Spec: https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
 */
export function captureConnection(): LazysnapConnectionInfo {
  // navigator.connection is not in the standard TS lib — cast carefully
  const nav = typeof navigator !== "undefined" ? navigator : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conn = (nav as any)?.connection ?? (nav as any)?.mozConnection ?? (nav as any)?.webkitConnection;

  return {
    effectiveType: conn?.effectiveType,
    downlink:      conn?.downlink,
    rtt:           conn?.rtt,
    saveData:      conn?.saveData,
  };
}
