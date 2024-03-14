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
    let lsBetweenStops: IStop[] = [];
    let rsBetweenStops: IStop[] = [];

    // loop through each stop
    for (let index = 0; index < fromStops.length; index++) {
      const from = fromStops[index];
      const to = toStops[index] || toStops[0];

      if (!from || !to) {
        continue;
      }

      const startIndex = stops.findIndex((stop) => stop.id === from.id);
      const endIndex = stops.findIndex((stop) => stop.id === to.id);

      if (startIndex > endIndex) {
        // end is before start and need to reversed
        const leftSideBetweenStops = stops
          .slice(endIndex, startIndex + 1)
          .reverse();

        lsBetweenStops = leftSideBetweenStops;
      } else {
        const rightSideBetweenStops = stops.slice(startIndex, endIndex + 1);

        rsBetweenStops = rightSideBetweenStops;
      }
    }

    if (lsBetweenStops.length === 0) {
      return rsBetweenStops;
    }

    if (rsBetweenStops.length === 0) {
      return lsBetweenStops;
    }

    // return shorter side
    if (lsBetweenStops.length < rsBetweenStops.length) {
      return lsBetweenStops;
    }

    return rsBetweenStops;
  }
}
