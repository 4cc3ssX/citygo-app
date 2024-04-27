import logger from "@/lib/logger";
import { ILogger } from "@/typescript/logger";
import { Collection, Db, Document, Filter, MongoClient } from "mongodb";
import { BaseModel } from "./base";
import {
  ISuggestion,
  ISuggestionSearchType,
} from "@/typescript/models/suggestions";

export class Suggestions extends BaseModel<ISuggestion> {
  readonly _logger: ILogger;
  readonly _db: Db;
  readonly _collection: Collection<ISuggestion>;
  readonly COLLECTION_NAME = "suggestions";
  _defaultProjection: Document = { _id: 0 };

  constructor(_client: MongoClient, _logger: ILogger = logger) {
    super();

    this._logger = _logger;
    this._db = _client.db();
    this._collection = this._db.collection(this.COLLECTION_NAME);
  }

  searchSuggestions(search: ISuggestionSearchType) {
    const filters: Filter<ISuggestion> = this.createFilter(search);

    const suggestions = this._collection
      .find(filters)
      .project(this._defaultProjection);

    return suggestions.toArray() as Promise<ISuggestion[]>;
  }

  // MARK: createFilter
  protected createFilter(search: ISuggestionSearchType): Filter<ISuggestion> {
    const filters: Filter<ISuggestion> = { $and: [] };

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
