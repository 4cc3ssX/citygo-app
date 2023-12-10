export type ReplaceValueByType<T, From, To> = {
  [K in keyof T]: T[K] extends From ? To : T[K];
};
