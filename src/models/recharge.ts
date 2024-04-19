import logger from "@/lib/logger";
import { ILogger } from "@/typescript/logger";
import { IRecharge, IRechargeSearchType } from "@/typescript/models/recharge";
import { Pagination } from "@/typescript/response";
import { Collection, Db, Document, Filter, MongoClient } from "mongodb";
import { BaseModel } from "./base";

export class Recharge extends BaseModel<IRecharge> {
  readonly _logger: ILogger;
  readonly _db: Db;
  readonly _collection: Collection<IRecharge>;
  readonly COLLECTION_NAME = "recharge"  as const;
  _defaultProjection: Document = { _id: 0 };

  constructor(_client: MongoClient, _logger: ILogger = logger) {
    super();

    this._logger = _logger;
    this._db = _client.db();
    this._collection = this._db.collection(this.COLLECTION_NAME);
  }

  async countStations(search: IRechargeSearchType): Promise<number> {
    const count = await this._collection.countDocuments(
      this.createFilter(search)
    );
    return count;
  }

  searchRechargeStations(
    search: IRechargeSearchType,
    { page, size }: Omit<Partial<Pagination>, "total" | "nextPage" | "prevPage">
  ) {
    const filters: Filter<IRecharge> = this.createFilter(search);

    const rechargeStations = this._collection
      .find(filters)
      .project(this._defaultProjection);

    if (page && size) {
      rechargeStations.skip(size * (page - 1));
      rechargeStations.limit(size);
    }

    return rechargeStations.toArray() as Promise<IRecharge[]>;
  }

  // MARK: createFilter
  protected createFilter(search: IRechargeSearchType): Filter<IRecharge> {
    const filters: Filter<IRecharge> = { $and: [] };

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
