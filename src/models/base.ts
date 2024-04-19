import { ILogger } from "@/typescript/logger";
import { Collection, Db, Filter } from "mongodb";

export abstract class BaseModel<T> {
  abstract readonly _logger: ILogger;
  abstract readonly _db: Db;
  abstract readonly _collection: Collection<any>;
  abstract readonly COLLECTION_NAME: string;

  protected abstract createFilter(search: unknown): Filter<T>;
}
