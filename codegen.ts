import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "schema.graphql",
  documents: ["app/**/*.{ts,tsx}"],
  ignoreNoDocuments: true,
  generates: {
    "./app/graphql/": {
      preset: "client",
      config: {
        documentMode: "string",
        scalars: {
          ObjectID: "string",
          Time: "string",
          UInt64: "string",
        },
      },
    },
  },
};

export default config;
