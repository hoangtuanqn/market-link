/**
 * Whether the site is under maintenance right now. Filled once at boot (PlatformStatusSync) and flipped to true the
 * instant any API call comes back 503 MAINTENANCE_MODE (axiosInstance) — an admin turning it on mid-session should not
 * need a page reload before everyone else sees the notice.
 */
let maintenanceMode = false;
const listeners = new Set<() => void>();

const PlatformStatus = {
  get: () => maintenanceMode,

  set: (value: boolean) => {
    if (value === maintenanceMode) return;
    maintenanceMode = value;
    listeners.forEach((listener) => listener());
  },

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export default PlatformStatus;
