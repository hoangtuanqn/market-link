class Helper {
  /** OpenStreetMap directions to a point, opened in a new tab (D-12). */
  static directionsUrl(lat: number, lng: number) {
    return `https://www.openstreetmap.org/directions?to=${lat}%2C${lng}`;
  }

  /** Joins class names, skipping falsy values. */
  static cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ');
  }
}
export default Helper;
