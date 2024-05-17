import { Connection, QueryResult } from "mysql2/promise";
import mysql from "mysql2/promise";
import { MySql2Database, MySqlQueryResult } from "drizzle-orm/mysql2";
import { sql, relations } from "drizzle-orm";
import {
    int,
    text,
    mysqlTable,
    mysqlSchema,
    mediumtext,
    boolean,
    json,
    timestamp,
    datetime,
    date,
    double,
    float,
    varchar,
    MySqlSchema,
    time,
    decimal,
    year,
    MySqlTable,
} from "drizzle-orm/mysql-core";
import { drizzle } from "drizzle-orm/mysql2";

import { TableColumn } from "../types";
const pluralize = require('pluralize');
import { AdapterConnection } from "./type";
import { AdapterInterface } from "./adapterInterface";

import { encycle, decycle } from "json-cyclic"

export default class Mysql implements AdapterInterface {
    availableTypes = [
        'varchar',
        'int',
        'smallint',
        'mediumint',
        'bigint',
        'text',
        'mediumtext',
        'float',
        'decimal',
        'double',
        'double precision',
        'real',
        'boolean',
        'date',
        'datetime',
        'time',
        'timestamp',
        'binary',
        'varbinary',
        'json',
        'jsonb',
        'uuid'
    ];

    keyTypes = [
        'PRI', // primary key
        'UNI', // unique key
        "MUL" // multiple
    ]

    connection: Connection;
    databaseName: string;
    db: MySql2Database;
    mySchema: MySqlSchema;

    protected connectionParams: AdapterConnection;

    constructor(params: AdapterConnection) {
        this.connectionParams = params;

        if (!this.connectionParams.database) {
            throw new Error("Missing database name");
        }
    }

    async connect() {
        this.connection = await mysql.createConnection({
            host: this.connectionParams.host,
            user: this.connectionParams.user,
            password: this.connectionParams.password,
            database: this.connectionParams.database,
        });

        this.db = drizzle(this.connection);
        this.databaseName = this.connection.config.database;
    }

    getConnection() {
        return this.connection;
    }

    async extractSchema(tableName?: string) {
        await this.connect();

        this.mySchema = mysqlSchema(this.databaseName);
        if (tableName) {
            mysqlSchema[tableName] = this.buildTableSchema(tableName);
            await this.buildTableRelations(tableName,);
            return mysqlSchema;
        }
        const tableNames = await this.getTableList();
        for (const tableName of tableNames) {
            this.mySchema[tableName] = await this.buildTableSchema(tableName);
        }
        for (const tableName of tableNames) {
            await this.buildTableRelations(tableName);
        }
        return this.mySchema;
    }

    async getTableList() {
        const [tables] = await this.connection.query("SHOW TABLES");
        const result: Array<string> = [];

        for (const table of tables) {
            const name = table[`Tables_in_${this.databaseName}`];
            if (!name.startsWith('pma__')) {
                result.push(name);
            }
        }

        return result;
    }
    /**
     *
     *
     * @param {string} tableName
     * @return {*}  {Promise<Array<TableInfo>>}
     * @memberof MySql
     */
    async getForeignKeys(tableName: string): Promise<TableInfo[]> {
        const query = sql`
            SELECT
            CONSTRAINT_NAME, 
            TABLE_NAME,
            COLUMN_NAME, 
            REFERENCED_TABLE_NAME, 
            REFERENCED_COLUMN_NAME
            FROM
                INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE
            TABLE_SCHEMA = ${this.databaseName}
            AND TABLE_NAME = ${tableName}
            AND REFERENCED_TABLE_NAME IS NOT NULL;
        `;

        const [results]: MySqlQueryResult = await this.db.execute(query);

        if (results.length === 0) {
            return [];
        }
        return results;
    }
    /**
     *
     *
     * @param {string} tableName
     * @return {*}  {Promise<TableInfo[]>}
     * @memberof MySql
     */
    async getPrimaryKeys(tableName: string): Promise<TableInfo[]> {
        const query = sql`
        SELECT * 
            FROM information_schema.KEY_COLUMN_USAGE 
        WHERE 
            TABLE_SCHEMA = ${this.databaseName} AND 
            TABLE_NAME = ${tableName} AND 
            CONSTRAINT_NAME = 'PRIMARY';
        `;

        const [results]: MySqlQueryResult = await this.db.execute(query);

        return results;
    }
    /**
     *
     *
     * @param {string} tableName
     * @return {*} 
     * @memberof MySql
     */
    async getTableColumns(tableName: string): Promise<QueryResult> {
        const query = `SHOW COLUMNS FROM ${tableName}`;
        const [columns] = await this.connection.query(query);
        return columns;
    }

    async getForeignKeyOf(tableName: string, keyName: string) {
        const query = sql`
            SELECT *
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE
                TABLE_SCHEMA = ${this.databaseName}
                AND REFERENCED_TABLE_NAME = ${tableName}
                AND CONSTRAINT_NAME <> 'PRIMARY'
                AND TABLE_NAME IS NOT NULL;
            `
        const [results] = await this.db.execute(query);

        return results;
    }

    /**
 *
 *
 * @param {string} tableName
 * @param {MySqlSchema} mySchema
 * @return {*} 
 * @memberof MySql
 */
    async buildTableRelations(tableName: string) {
        const foreignKeys = await this.getForeignKeys(tableName);
        const manyForeignKeys = await this.getForeignKeyOf(tableName, "id");

        if (Object.values(foreignKeys).length === 0) {
            return [];
        }
        const relationTable = this.mySchema[tableName];

        this.mySchema[`${tableName}Relations`] = relations(
            relationTable,
            ({ one, many }) => {
                const relations = {};
                for (const foreignKey of foreignKeys) {
                    const columnName = foreignKey.COLUMN_NAME;
                    const referencedTableName = foreignKey.REFERENCED_TABLE_NAME;
                    const referencedColumnName = foreignKey.REFERENCED_COLUMN_NAME;
                    const referencedTable = this.mySchema[referencedTableName];

                    // const truncatedName = truncateForeignKey(columnName);

                    relations[referencedTableName.trim()] = one(referencedTable, {
                        fields: [relationTable[columnName]],
                        references: [referencedTable[referencedColumnName]],
                    })
                }

                for (const foreignKey of manyForeignKeys) {
                    const columnName = foreignKey.COLUMN_NAME;
                    const TableName = foreignKey.TABLE_NAME;
                    const ReferencedTableName = foreignKey.REFERENCED_TABLE_NAME;
                    const pluralizedName = pluralize(TableName);



                    relations[pluralizedName.trim()] = many(this.mySchema[TableName]);
                }

                return relations;
            }
        );
    }

    /**
     *
     *
     * @param {string} tableName
     * @return {MySqlTable} 
     * @memberof MySql
     */
    async buildTableSchema(tableName: string) {
        const columns: TableColumn = await this.getTableColumns(tableName);

        const drizzleColumns: any = {};

        for (const column of columns) {
            const columnName = column.Field;
            const columnType = column.Type;
            // Aggiungi la colonna allo schema Drizzle
            if (columnName && columnType) {
                switch (columnType) {
                    case "int":
                        drizzleColumns[columnName] = int(columnName);
                        break;
                    case "double":
                        drizzleColumns[columnName] = double(columnName);
                        break;
                    case "float":
                        drizzleColumns[columnName] = float(columnName);
                        break;
                    case "decimal":
                        drizzleColumns[columnName] = decimal(columnName);
                        break;
                    case "text":
                        drizzleColumns[columnName] = text(columnName);
                        break;
                    case "mediumtext":
                        drizzleColumns[columnName] = mediumtext(columnName);
                        break;
                    case "tinyint(1)":
                        drizzleColumns[columnName] = boolean(columnName);
                        break;
                    case "json":
                        drizzleColumns[columnName] = json(columnName);
                        break;
                    case "timestamp":
                        drizzleColumns[columnName] = timestamp(columnName);
                        break;
                    case "datetime":
                        drizzleColumns[columnName] = datetime(columnName);
                        break;
                    case "date":
                        drizzleColumns[columnName] = date(columnName);
                        break;
                    case "year":
                        drizzleColumns[columnName] = year(columnName);
                        break;
                    case "time":
                        drizzleColumns[columnName] = time(columnName);
                        break;
                    case "varchar(255)":
                        drizzleColumns[columnName] = varchar(columnName, {
                            length: 255,
                        });
                        break;

                    default:
                        drizzleColumns[columnName] = text(columnName);
                        break;
                }

                drizzleColumns[columnName] = this.setColumnParams(column, drizzleColumns[columnName]);
            }
        }

        // Define drizzle table
        const drizzleTable = mysqlTable(tableName, drizzleColumns);

        return drizzleTable;
    }

    private setColumnParams(column, drizzleColumn) {
        if (column.Key === 'PRI') {
            drizzleColumn.config.primaryKey = true;
            drizzleColumn.primaryKey();
        }

        if (column.Extra === 'auto_increment') {
            drizzleColumn.config.autoIncrement = true;
        }

        if (column.Null === 'YES') {
            drizzleColumn.config.notNull = false;
        }

        if (column.Default !== null) {
            drizzleColumn.config.hasDefault = true;
        }
        return drizzleColumn;
    }
}