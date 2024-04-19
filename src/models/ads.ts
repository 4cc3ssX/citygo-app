import logger from "@/lib/logger";
import { ILogger } from "@/typescript/logger";
import { Db, Collection, MongoClient, Document, Filter } from "mongodb";
import { BaseModel } from "./base";
import { IAds, IAdSearchType } from "@/typescript/models/ads";

export class Ads extends BaseModel<IAds> {
  readonly _logger: ILogger;
  readonly _db: Db;
  readonly _collection: Collection<IAds>;
  readonly COLLECTION_NAME = "ads" as const;
  _defaultProjection: Document = { _id: 0 };

  constructor(_client: MongoClient, _logger: ILogger = logger) {
    super();

    this._logger = _logger;
    this._db = _client.db();
    this._collection = this._db.collection(this.COLLECTION_NAME);
  }

  async searchAds(search: IAdSearchType): Promise<IAds[]> {
    const filters: Filter<IAds> = this.createFilter(search);

    const ads = await this._collection
      .find(filters)
      .project(this._defaultProjection)
      .toArray();

    return ads as IAds[];
  }

  // MARK: createFilter
  protected createFilter(search: IAdSearchType): Filter<IAds> {
    const filters: Filter<IAds> = { $and: [] };

    // loop through each property in the stop object
    Object.entries(search).forEach(([key, value]) => {
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

    return filters;
  }
}
