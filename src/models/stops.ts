import logger from "@/lib/logger";
import { ILogger } from "@/typescript/logger";
import { IStop, ISearchStops } from "@/typescript/models/stops";
import { Pagination } from "@/typescript/response";
import { Collection, Db, Document, Filter, MongoClient } from "mongodb";
import { BaseModel } from "./base";

export class Stops extends BaseModel<IStop> {
  readonly _logger: ILogger;
  readonly _db: Db;
  readonly _collection: Collection<IStop>;
  readonly COLLECTION_NAME = "stops";
  _defaultProjection: Document = { _id: 0 };

  constructor(_client: MongoClient, _logger: ILogger = logger) {
    super();

    this._logger = _logger;
    this._db = _client.db();
    this._collection = this._db.collection(this.COLLECTION_NAME);
  }

  async countStops(stop: ISearchStops): Promise<number> {
    const count = await this._collection.countDocuments(
      this.createFilter(stop)
    );
    return count;
  }

  /**
   * Retrieves all stops based on the given search criteria.
   *
   * @param {ISearchStops} stop The search criteria for the stops.
   * @return {Promise<IStop[]>} A promise that resolves to an array of stops.
   */
  async searchStops(
    stop: ISearchStops,
    { page, size }: Omit<Partial<Pagination>, "total" | "nextPage" | "prevPage">
  ): Promise<IStop[]> {
    const filters: Filter<IStop> = this.createFilter(stop);

    const stops = this._collection
      .find(filters)
      .project(this._defaultProjection);

    if (page && size) {
      stops.skip(size * (page - 1));
      stops.limit(size);
    }

    return stops.toArray() as Promise<IStop[]>;
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

  protected createFilter(search: ISearchStops): Filter<IStop> {
    const filters: Filter<IStop> = { $and: [] };

    // loop through each property in the stop object
    Object.entries(search).forEach(([key, value]) => {
      if ((key === "region" || key === "country") && value) {
        filters.$and?.push({
          $or: [
            { [key]: new RegExp(`${value}`, "i") },
            { [key]: new RegExp(`${value}`, "i") },
          ],
        });
      } else if (typeof value === "string" && value) {
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

    return filters;
  }
}
