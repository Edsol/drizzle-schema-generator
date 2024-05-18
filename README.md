[![NPM](https://nodei.co/npm/drizzle-schema-generator.png)](https://nodei.co/npm/drizzle-schema-generator/)

# Drizzle schema generator

Automatically generate of Drizzle ORM schema from existing database

## Install

```bash
npm install drizzle-schema-generator
```

## Usage

import the Adapter and inizialize it with the connection information:

```typescript
import { Adapter } from "drizzle-schema-generator";

const adatper = new Adapter({
  dbType: process.env.DATABASE_TYPE,
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});
```

Get Drizzle ORM schema:

```typescript
const drizzelSchema = await adatper.getSchema();
```

or get connection:

```typescript
adapter.getConnection();
```

## Roadmap

[ ] Extend to other databases (postreSQL, SQLite)

## Use case

Extract schema from existing database to start Graphql server (like Apollo) using [drizzle-graphql](https://github.com/drizzle-team/drizzle-graphql) plugin:

```typescript
import dotenv from "dotenv";
dotenv.config();

import { buildSchema } from "drizzle-graphql";
import { drizzle } from "drizzle-orm/mysql2";

import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { Adapter } from "drizzle-schema-generator";

async function main() {
  const adatper = new Adapter({
    dbType: process.env.DATABASE_TYPE,
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });

  const drizzelSchema = await adatper.getSchema();
  const db = drizzle(adatper.getConnection(), {
    schema: drizzelSchema,
    mode: "default",
  });
  const { schema } = buildSchema(db);
  const server = new ApolloServer({ schema });
  const { url } = await startStandaloneServer(server);
  console.log(`🚀 Apollo Server ready at ${url}`);
}

main();
```
