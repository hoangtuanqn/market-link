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
