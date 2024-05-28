import dotenv from "dotenv";
const envPath = `${__dirname}/../.env`;
dotenv.config({ path: envPath });

import { buildSchema } from "drizzle-graphql";
import { drizzle } from "drizzle-orm/mysql2";

import { startApollo } from "drizzle-schema-generator/example/common";

import mysql from "mysql2/promise";
import * as drizzleSchema from "drizzle-schema-generator/example/local/schema/mysql";

const connection = await mysql.createConnection({
    host: process.env.MYSQL_DATABASE_HOST,
    user: process.env.MYSQL_DATABASE_USER,
    password: process.env.MYSQL_DATABASE_PASSWORD,
    database: process.env.MYSQL_DATABASE_NAME,
});

const db = drizzle(connection, { schema: drizzleSchema, mode: "default" });

const { schema } = await buildSchema(db);
await startApollo({ schema });