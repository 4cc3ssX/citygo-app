import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: process.env.SWAGGER_API_DOC_PATH, // define api folder under app folder
    definition: {
      openapi: "3.0.0",
      info: {
        title: "CityGo API",
        version: "1.0.0",
        description:
          "CityGo is a Next.js application designed to provide effortless bus route and stop searches. This API enables users to retrieve information about bus line routes, stops, and perform health checks. Explore the various endpoints to access valuable data related to the CityGo transportation system.",
      },
      components: {},
      security: [],
    },
  });
  return spec;
};
