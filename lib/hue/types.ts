/** Philips Hue Bridge local API types. */

export interface HueSettings {
  /** LAN-IP van de Hue Bridge, bijv. 192.168.1.76 */
  bridgeIp: string;
  /** Application key (username) na koppelen via link-knop. */
  username: string;
}

export const defaultHueSettings: HueSettings = {
  bridgeIp: "192.168.1.76",
  username: "",
};

export interface HueLightState {
  on: boolean;
  /** Helderheid 1–254 (Hue-bereik). */
  bri: number | null;
  reachable: boolean;
}

export interface HueLight {
  id: string;
  name: string;
  type: string;
  modelid: string;
  manufacturername: string;
  state: HueLightState;
}

export interface HueStatus {
  configured: boolean;
  connected: boolean;
  bridgeIp: string;
  bridgeName: string | null;
  lightCount: number | null;
  error: string | null;
  lastCheckedAt: string | null;
}
