import { ApolloServer, ApolloServerOptions } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

export async function startApollo(args: ApolloServerOptions) {
    const server = new ApolloServer(args);
    const { url } = await startStandaloneServer(server);
    console.log(`🚀 Apollo Server ready at ${url}`);
}