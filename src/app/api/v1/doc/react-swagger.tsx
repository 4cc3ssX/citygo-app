"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

type Props = {
  spec: Record<string, any>;
  url: string | undefined;
};

const DynamicSwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
});

function ReactSwagger({ spec, url }: Props) {
  if (process.env.NODE_ENV === "development") {
    return <DynamicSwaggerUI spec={spec} />;
  }
  return <DynamicSwaggerUI url={url} />;
}

export default ReactSwagger;
