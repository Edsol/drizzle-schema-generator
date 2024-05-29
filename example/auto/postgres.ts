import dotenv from "dotenv";
const envPath = `${__dirname}/../.env`;
dotenv.config({ path: envPath });

import { buildSchema } from "drizzle-graphql";
import { drizzle } from "drizzle-orm/postgres-js";

import { Adapter } from "../../src/index";
import { startApollo } from "drizzle-schema-generator/example/common";

const adatper = new Adapter({
    dbType: process.env.POSTGRES_DATABASE_TYPE,
    host: process.env.POSTGRES_DATABASE_HOST,
    user: process.env.POSTGRES_DATABASE_USER,
    port: process.env.POSTGRES_DATABASE_PORT,
    password: process.env.POSTGRES_DATABASE_PASSWORD,
    database: process.env.POSTGRES_DATABASE_NAME,
    schema: process.env.POSTGRES_SCHEMA_NAME,
}, process.env.DEBUG ?? false);

const drizzleSchema = await adatper.getSchema();

const db = drizzle(adatper.getConnection(), {
    schema: drizzleSchema,
    mode: "default",
    logger: false
});

const { schema } = buildSchema(db, {
    // Use it in case your database is too big and takes up too much RAM memory
    // https://github.com/drizzle-team/drizzle-graphql/issues/11
    relationsDepthLimit: 2
});
await startApollo({ schema });