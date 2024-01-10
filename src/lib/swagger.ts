import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api", // define api folder under app folder
    definition: {
      openapi: "3.0.0",
      info: {
        title: "OneBus API",
        version: "1.0.0",
        description:
          "OneBus is a Next.js application designed to provide effortless bus route and stop searches. This API enables users to retrieve information about bus line routes, stops, and perform health checks. Explore the various endpoints to access valuable data related to the OneBus transportation system.",
      },
      components: {},
      security: [],
    },
  });
  return spec;
};
