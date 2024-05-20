import { Connection, QueryResult } from "mysql2/promise";
import mysql from "mysql2/promise";
import { MySql2Database, MySqlQueryResult } from "drizzle-orm/mysql2";
import { sql, relations, ColumnBuilder, Table, Many, createMany, One } from "drizzle-orm";
import * as mysqlCore from "drizzle-orm/mysql-core";
import { drizzle } from "drizzle-orm/mysql2";

import { TableColumn, AdapterConnection, TableInfo, ForeignKey } from "../types";
import { AdapterInterface } from "./adapterInterface";
const pluralize = require('pluralize');
import crypto from 'crypto';

import fs from 'fs';
import { encycle, decycle } from "json-cyclic"
const util = require('util')

export default class Mysql implements AdapterInterface {

    protected debugMode = false;
    connection: Connection;
    databaseName?: string;
    db: MySql2Database;
    tableNameList: string[];
    schema: mysqlCore.MySqlSchema;

    protected connectionParams: AdapterConnection;

    constructor(params: AdapterConnection, debugMode = false) {
        this.connectionParams = params;
        this.debugMode = debugMode;

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
    /**
     *
     *
     * @return {*} 
     * @memberof Mysql
     */
    getConnection() {
        return this.connection;
    }
    /**
     *
     *
     * @return {*} 
     * @memberof Mysql
     */
    async extractSchema() {
        await this.connect();

        this.schema = mysqlCore.mysqlDatabase(this.databaseName ?? 'schema');

        await this.getTableList();
        await this.buildTables(this.tableNameList);
        await this.buildTableRelations(this.tableNameList);

        return this.schema;
    }
    /**
     *
     *
     * @return {*} 
     * @memberof Mysql
     */
    async getTableList() {
        const [tables] = await this.connection.query("SHOW TABLES");
        const result: Array<string> = [];

        // NOTE: refactoring
        for (const table of Object.values(tables)) {
            const name = table[`Tables_in_${this.databaseName}`];
            if (!name.startsWith('pma__')) {
                result.push(name);
            }
        }

        this.tableNameList = result;
    }

    /**
     *
     *
     * @param {string} tableName
     * @return {*} (Promise<TableColumn[]>)
     * @memberof MySql
     */
    async getTableColumns(tableName: string): Promise<TableColumn[]> {
        const query = sql`
        SELECT 
            COLUMN_NAME as name, 
            DATA_TYPE as type,
            COLUMN_DEFAULT as column_default,
            COLUMN_KEY as column_key,
            IS_NULLABLE as nullable,
            CHARACTER_MAXIMUM_LENGTH as char_length,
            NUMERIC_PRECISION as num_precision,
            DATETIME_PRECISION as datetime_precision,
            EXTRA as extra,
            COLUMN_COMMENT as comment
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ${this.databaseName}
        AND TABLE_NAME = ${tableName}
        ORDER BY ORDINAL_POSITION;
    `;

        const [results] = await this.db.execute(query);
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
     * @private
     * @param {string} tableName
     * @param {string} columnName
     * @return {*}  {(Promise<TableInfo | undefined>)}
     * @memberof Mysql
     */
    private async getForeignKey(tableName: string, columnName: string): Promise<TableInfo | undefined> {
        const query = sql`
        SELECT * 
        FROM
            INFORMATION_SCHEMA.KEY_COLUMN_USAGE as kcu
        INNER JOIN information_schema.referential_constraints AS rc
        ON (
            kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
            AND kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
        )
        WHERE
        kcu.TABLE_SCHEMA = ${this.databaseName}
        AND kcu.TABLE_NAME = ${tableName}
        AND rc.TABLE_NAME = ${tableName};
    `;

        const [results]: MySqlQueryResult = await this.db.execute(query);

        if (results.length === 0) {
            return undefined;
        }
        return results[0];
    }

    /**
     *
     *
     * @param {string} tableName
     * @return {*}  {Promise<Array<TableInfo>>}
     * @memberof MySql
     */
    async getForeignKeys(tableName: string): Promise<ForeignKey[]> {
        const query = sql`
                SELECT
                    CONSTRAINT_NAME as name,
                    TABLE_NAME as table_name,
                    COLUMN_NAME as column_name,
                    REFERENCED_TABLE_NAME as referenced_table_name,
                    REFERENCED_COLUMN_NAME as referenced_column_name
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
     * one to many 
     *
     * @param {string} tableName
     * @param {string} keyName
     * @return {*} 
     * @memberof Mysql
     */
    async getForeignKeyOf(tableName: string, keyName: string): Promise<ForeignKey[]> {
        const query = sql`
        SELECT
            CONSTRAINT_NAME as name,
            TABLE_NAME as table_name,
            COLUMN_NAME as column_name,
            REFERENCED_TABLE_NAME as referenced_table_name,
            REFERENCED_COLUMN_NAME as referenced_column_name
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE 
                TABLE_SCHEMA = ${this.databaseName} 
                AND REFERENCED_TABLE_NAME = ${tableName} 
                AND CONSTRAINT_NAME <> "PRIMARY" 
                AND REFERENCED_TABLE_NAME IS NOT NULL;
            `;

        const [results] = await this.db.execute(query);

        return results;
    }
    /**
     *
     *
     * @private
     * @param {string} tableName
     * @return {*}  {MySqlTable}
     * @memberof Mysql
     */
    private getExistingTable(tableName: string): mysqlCore.AnyMySqlTable {
        return this.schema[tableName];
    }
    /**
     *
     *
     * @private
     * @param {string} tableName
     * @return {boolean} 
     * @memberof Mysql
     */
    private tableExists(tableName: string): boolean {
        return this.tableNameList.includes(tableName);
    }

    /**
     *
     *
     * @param {string[]} tableList
     * @return {} 
     * @memberof MySql
     */
    async buildTables(tableList: string[]) {
        const tables = {};

        for (const tableName of tableList) {
            this.schema[tableName] = await this.buildTable(tableName);
        }

        return tables;
    }
    /**
     *
     *
     * @private
     * @param {string} tableName
     * @return {*} 
     * @memberof Mysql
     */
    private async buildTable(tableName: string) {
        const tableColumns = {};

        const columns: TableColumn[] = await this.getTableColumns(tableName);
        for (const column of columns) {
            if (mysqlCore[column.type]) {
                if (column.type === 'varchar') {
                    tableColumns[column.name] = mysqlCore[column.type](column.name, column.char_length);
                } else if (column.type === 'bigint') {
                    tableColumns[column.name] = mysqlCore[column.type](column.name, column.num_precision);
                } else {
                    tableColumns[column.name] = mysqlCore[column.type](column.name);
                }
            } else {
                tableColumns[column.name] = mysqlCore.text(column.name);
            }

            const foreignKey = await this.getForeignKey(tableName, column.name);

            const columnWithMeta = this.setColumnParams(column, tableColumns[column.name], tableName, foreignKey);

            tableColumns[column.name] = columnWithMeta;
        }

        return this.schema.table(tableName, tableColumns);
    }

    /**
     *
     *
     * @private
     * @param {TableColumn} column
     * @param {ColumnBuilder} tableColumns
     * @param {string} tableName
     * @return {*} 
     * @memberof Mysql
     */
    private setColumnParams(column: TableColumn, tableColumn: ColumnBuilder, tableName: string, foreignKey?: TableInfo) {
        switch (column.column_key) {
            case "PRI":
                tableColumn.autoincrement().primaryKey();
                break;
            case "PI":
                break;
            case "MUL":
                if (tableName === 'filiale' && foreignKey !== undefined) {
                    const table = this.getExistingTable(foreignKey.REFERENCED_TABLE_NAME);
                    tableColumn.references(() => table[foreignKey.REFERENCED_COLUMN_NAME])
                }
                break;
        }

        if (column.extra === 'auto_increment') {
            tableColumn.autoincrement();
        }

        if (column.nullable === 'NO') {
            tableColumn.notNull();
        }

        if (column.column_default !== undefined) {
            tableColumn.default(column.column_default);
        }

        return tableColumn;
    }

    /**
     *
     *
     * @param {string} tableName
     * @param {MySqlSchema} schema
     * @return {*} 
     * @memberof MySql
    */
    async buildTableRelations(tableList: string[]) {

        for (const tableName of tableList) {
            const relationTable = this.getExistingTable(tableName);

            if (relationTable === undefined) {
                continue;
            }

            const foreignKeys = await this.getForeignKeys(tableName);
            const manyForeignKeys = await this.getForeignKeyOf(tableName, "id");

            const tableRelation = relations(relationTable, ({ one, many }) => {
                const oneRelations = this.buildOneRelation(tableName, foreignKeys, one);
                const manyRelations = this.buildManyRelation(tableName, manyForeignKeys, many);
                return { ...oneRelations, ...manyRelations };
            });

            const relationName = `${tableName}Relations`;
            this.schema[relationName] = tableRelation;
        }

    }

    /**
     *
     *
     * @param {string} tableName
     * @param {*} foreignKeys
     * @param {CallableFunction} one
     * @return {*} 
     * @memberof Mysql
     */
    buildOneRelation(tableName: string, foreignKeys: ForeignKey[], one: CallableFunction) {
        const relationTable = this.getExistingTable(tableName);
        const relations = {};

        for (const foreignKey of foreignKeys) {
            const columnName = foreignKey.column_name;
            let fieldName = columnName;

            if (columnName.endsWith("_id")) {
                fieldName = columnName.slice(0, -3);
            }

            const referencedTableName = foreignKey.referenced_table_name;
            const referencedColumnName = foreignKey.referenced_column_name;

            const referencedTable = this.getExistingTable(referencedTableName);
            const relationName = this.hash(tableName, columnName);

            // skip if referencedTable not exists
            if (referencedTable && relationTable) {
                relations[`_${fieldName}`] = one(referencedTable, {
                    fields: [relationTable[columnName]],
                    references: [referencedTable[referencedColumnName]],
                    relationName: relationName
                })
            }


        }


        return relations;
    }


    /**
     *
     *
     * @private
     * @param {string} tableName
     * @param {object} relations
     * @param {CallableFunction} many
     * @return {*} 
     * @memberof Mysql
     */
    buildManyRelation(tableName: string, manyForeignKeys: ForeignKey[], many: CallableFunction) {
        const relations = {};

        for (const foreignKey of manyForeignKeys) {
            const TableName = foreignKey.table_name;

            const columnName = foreignKey.column_name;
            const ReferencedTableName = foreignKey.referenced_table_name;
            const relatedTable = this.getExistingTable(TableName);

            const pluralizedName = pluralize(TableName).trim();
            const relationName = this.hash(TableName, columnName);

            if (relatedTable && this.tableExists(TableName)) {
                relations[pluralizedName] = many(relatedTable, {
                    relationName: relationName
                });
            }


        }
        return relations;
    }

    hash(input1: string, input2: string): string {
        const inputString = input1 + input2;
        const hash = crypto.createHash('sha256').update(inputString).digest('hex');
        return hash;
    }
}