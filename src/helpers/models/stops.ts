export class StopModelHelper {
  constructor() {}

  /**
   * Determine if a stop is on the left hand side of the route.
   * @param id 
   * @returns 
   */
  public static isOnLeftHandSide(id: number): boolean {
    return id % 2 === 0;
  }

  /**
   * Finds the stops between two given stop IDs in an array of stop IDs.
   *
   * @param {number} from - The starting stop ID.
   * @param {number} to - The ending stop ID.
   * @param {number[]} stops - An array of stop IDs.
   * @return {number[]} - An array of stop IDs between the starting and ending stops.
   */
  public static findInBetweenStops(
    from: number,
    to: number,
    stops: number[]
  ): number[] {
    let betweenStops: number[] = stops;

    const startIndex = stops.findIndex((stopId) => stopId === from);

    const endIndex = stops.findIndex((stopId) => stopId === to);

    if (startIndex === -1 || endIndex === -1) {
      // stop not found
      return [];
    }

    if (startIndex > endIndex) {
      // end is before start and need to reversed
      betweenStops = stops.slice(endIndex, startIndex + 1).reverse();
    } else {
      betweenStops = stops.slice(startIndex, endIndex + 1);
    }

    return betweenStops;
  }
}
