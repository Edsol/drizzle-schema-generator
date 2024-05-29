import dotenv from "dotenv";
const envPath = `${__dirname}/../.env`;
dotenv.config({ path: envPath });

import { buildSchema } from "drizzle-graphql";
import { drizzle } from "drizzle-orm/mysql2";

import { Adapter } from "../../src/index";
import { startApollo } from "drizzle-schema-generator/example/common";

const adatper = new Adapter({
    dbType: process.env.MYSQL_DATABASE_TYPE,
    host: process.env.MYSQL_DATABASE_HOST,
    user: process.env.MYSQL_DATABASE_USER,
    password: process.env.MYSQL_DATABASE_PASSWORD,
    database: process.env.MYSQL_DATABASE_NAME,
}, process.env.DEBUG ?? false);


const drizzleSchema = await adatper.getSchema();

const db = drizzle(adatper.getConnection(), {
    schema: drizzleSchema,
    mode: "default",
    logger: false
});
const { schema } = await buildSchema(db, {
    // Use it in case your database is too big and takes up too much RAM memory
    // https://github.com/drizzle-team/drizzle-graphql/issues/11
    relationsDepthLimit: 2
}
);
await startApollo({ schema });