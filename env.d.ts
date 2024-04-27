declare namespace NodeJS {
  interface ProcessEnv {
    MONGODB_URI: string;

    DEFAULT_COUNTRY: string;
    DEFAULT_REGION: string | undefined;

    SWAGGER_API_DOC_PATH: string;
  }
}
