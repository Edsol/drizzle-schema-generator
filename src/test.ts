import dotenv from 'dotenv';
dotenv.config()

import { buildSchema } from 'drizzle-graphql';
import { drizzle } from "drizzle-orm/mysql2";

import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { Adapter } from './main';

async function main() {
    const adatper = new Adapter({
        dbType: process.env.DATABASE_TYPE,
        host: process.env.DATABASE_HOST,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
    });


    const drizzelSchema = await adatper.getSchema();
    const db = drizzle(adatper.getConnection(), { schema: drizzelSchema, mode: "default" });
    const { schema } = buildSchema(db);
    const server = new ApolloServer({ schema });
    const { url } = await startStandaloneServer(server);
    console.log(`🚀 Apollo Server ready at ${url}`);
}

main()