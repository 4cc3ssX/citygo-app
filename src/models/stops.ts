import logger from "@/lib/logger";
import { ILogger } from "@/typescript/logger";
import { IStop, ISearchStops } from "@/typescript/models/stops";
import { Collection, Db, Document, Filter, MongoClient } from "mongodb";

export class Stops {
  private _logger: ILogger;
  private _db: Db;
  private _collection: Collection<IStop>;
  private _defaultProjection: Document = { _id: 0 };

  constructor(_client: MongoClient, _logger: ILogger = logger) {
    this._logger = _logger;

    this._db = _client.db();
    this._collection = this._db.collection<IStop>("stops");
  }

  /**
   * Retrieves all stops based on the given search criteria.
   *
   * @param {ISearchStops} stop The search criteria for the stops.
   * @return {Promise<IStop[]>} A promise that resolves to an array of stops.
   */
  async searchStops(stop: ISearchStops): Promise<IStop[]> {
    const filters: Filter<IStop> = { $and: [] };

    // loop through each property in the stop object
    Object.entries(stop).forEach(([key, value]) => {
      if (typeof value === "string" && value) {
        filters.$and?.push({
          $or: [
            { [`${key}.en`]: new RegExp(`${value}`, "i") },
            { [`${key}.mm`]: new RegExp(`${value}`, "i") },
          ],
        });
      }
    });

    // If there are no filters, remove the $and property
    if (filters.$and?.length === 0) {
      delete filters.$and;
    }

    const stops = await this._collection
      .find(filters)
      .project(this._defaultProjection)
      .sort({ "township.en": 1 }, "asc")
      .toArray();

    return stops as IStop[];
  }

  /**
   * Retrieves a stop by its ID.
   *
   * @param {number} id - The ID of the stop.
   * @return {Promise<IStop | null>} A promise that resolves to the stop object or null if not found.
   */
  async getStop(id: number): Promise<IStop | null> {
    const stop = await this._collection.findOne(
      { id },
      {
        projection: this._defaultProjection,
      }
    );

    return stop;
  }
}
