class LocalStorage {
  static setItem(key: string, value: string) {
    localStorage.setItem(key, value);
  }
  static getItem(key: string): string | null {
    return localStorage.getItem(key) ?? null;
  }
  static removeItem(key: string) {
    localStorage.removeItem(key);
  }
}
export default LocalStorage;
