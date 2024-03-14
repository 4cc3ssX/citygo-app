import { IStop } from "@/typescript/models/stops";

export class StopModelHelper {
  constructor() {}

  /**
   * Finds the stops between two given stop IDs in an array of stop IDs.
   *
   * @param {IStop[]} fromStops - The starting stop ID.
   * @param {IStop[]} toStops - The ending stop ID.
   * @param {number[]} stops - An array of stop IDs.
   * @return {number[]} - An array of stop IDs between the starting and ending stops.
   */
  public static findInBetweenStops(
    fromStops: IStop[],
    toStops: IStop[],
    stops: IStop[]
  ): IStop[] {
    const inBetweenStops: IStop[][] = [];

    // loop through each stop
    for (const from of fromStops) {
      for (const to of toStops) {
        if (!from || !to) {
          continue;
        }

        const startIndex = stops.findIndex((stop) => stop.id === from.id);
        const endIndex = stops.findIndex((stop) => stop.id === to.id);

        if (startIndex === -1 || endIndex === -1) {
          continue;
        }

        if (startIndex > endIndex) {
          // end is before start and need to reversed
          const leftSideBetweenStops = stops
            .slice(endIndex, startIndex + 1)
            .reverse();

          inBetweenStops.push(leftSideBetweenStops);
        } else {
          const rightSideBetweenStops = stops.slice(startIndex, endIndex + 1);

          inBetweenStops.push(rightSideBetweenStops);
        }
      }
    }

    // find the shortest in between stops
    const shortestInBetweenStops = inBetweenStops.reduce((prev, curr) => {
      return prev.length > 0 && prev.length < curr.length ? prev : curr;
    }, []);

    if (shortestInBetweenStops.length === 0) {
      console.log(fromStops, toStops, inBetweenStops);
    }

    return shortestInBetweenStops;
  }
}
