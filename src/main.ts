import Mysql from "./adapters/mysql";
import { AdapterConnection } from "./types";
export * from './types';

export class Adapter {

  private databaseAdapter;
  private connectionParams: AdapterConnection;
  private adapter: MySql;

  private availableAdapter = {
    mysql: (connection: AdapterConnection) => {
      return new Mysql(connection);
    },
  };

  constructor(connectionArgs: AdapterConnection) {
    this.validateConnectionArgs(connectionArgs);

    if (!Object.keys(this.availableAdapter).includes(connectionArgs.dbType)) {
      throw new Error(
        `No adapter was found for database ${connectionArgs.dbType}`
      );
    }

    this.connectionParams = connectionArgs;
    this.databaseAdapter = this.availableAdapter[connectionArgs.dbType];
    this.adapter = this.databaseAdapter(this.connectionParams);
  }

  /**
   *
   *
   * @param {AdapterConnection} connectionArgs
   * @memberof Adapter
   */
  private validateConnectionArgs(connectionArgs: AdapterConnection): void {
    const requiredFields: (keyof AdapterConnection)[] = [
      "dbType",
      "host",
      "user",
      "password",
      "database",
    ];

    for (const field of requiredFields) {
      if (
        connectionArgs[field] === undefined ||
        connectionArgs[field] === null
      ) {
        throw new Error(`Missing or invalid field: ${field}`);
      }
    }
  }

  /**
   *
   *
   * @return {*}
   * @memberof Adapter
   */
  async getSchema() {
    return await this.adapter.extractSchema();
  }

  /**
   *
   *
   * @return {*}
   * @memberof Adapter
   */
  getConnection() {
    return this.adapter.getConnection();
  }
}

