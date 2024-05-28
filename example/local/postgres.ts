import dotenv from "dotenv";
const envPath = `${__dirname}/../.env`;

import { buildSchema } from "drizzle-graphql";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from 'postgres';

import { startApollo } from "drizzle-schema-generator/example/common";
import * as drizzleSchema from "drizzle-schema-generator/example/local/schema/postgres";


const connection = postgres('', {
    host: process.env.POSTGRES_DATABASE_HOST,
    port: Number.parseInt(process.env.POSTGRES_DATABASE_PORT),
    username: process.env.POSTGRES_DATABASE_USER,
    password: process.env.POSTGRES_DATABASE_PASSWORD,
    database: process.env.POSTGRES_DATABASE_DATABASE
});


const db = drizzle(connection, { schema: drizzleSchema, logger: true });
const { schema } = buildSchema(db);
await startApollo({ schema });
