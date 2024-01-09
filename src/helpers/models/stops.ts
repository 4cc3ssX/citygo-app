/**
 * Determines if it is required to reverse the stops.
 *
 * @param {number} id - The ID of the number.
 * @return {boolean} A boolean value indicating if it is required to reverse the stops.
 */
export function isRequiredToReverseStops(id: number): boolean {
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
export function findInBetweenStops(
  from: number,
  to: number,
  stops: number[]
): number[] {
  let betweenStops: number[] = stops;

  const startIndex = stops.findLastIndex((stopId) => stopId === from);

  const endIndex = stops.findIndex((stopId) => stopId === to);

  if (startIndex === -1 || endIndex === -1) {
    // stop not found
    return betweenStops;
  }

  if (startIndex > endIndex) {
    // end is before start and need to reversed
    betweenStops = stops.slice(endIndex, startIndex + 1).reverse();
  } else {
    betweenStops = stops.slice(startIndex, endIndex + 1);
  }

  return betweenStops;
}
