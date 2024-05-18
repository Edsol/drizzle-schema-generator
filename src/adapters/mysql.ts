import { Connection, QueryResult } from "mysql2/promise";
import mysql from "mysql2/promise";
import { MySql2Database, MySqlQueryResult } from "drizzle-orm/mysql2";
import { sql, relations, ColumnBuilder, InferSelectModel, InferInsertModel } from "drizzle-orm";
import * as drizzleMysqlCore from "drizzle-orm/mysql-core";
import { drizzle } from "drizzle-orm/mysql2";

import { TableColumn, AdapterConnection } from "../types";
import { AdapterInterface } from "./adapterInterface";
const pluralize = require('pluralize');

import fs from 'fs';
import { encycle, decycle } from "json-cyclic"

export default class Mysql implements AdapterInterface {

    protected debugMode;
    connection: Connection;
    databaseName?: string;
    db: MySql2Database;
    tableNameList: string[];
    mySchema = {};
    tables = {};

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

    getConnection() {
        return this.connection;
    }

    async extractSchema() {
        await this.connect();

        await this.getTableList();
        await this.buildTableSchema(this.tableNameList);
        await this.buildTableRelations(this.tableNameList);

        return this.mySchema;
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
     * @return {*} 
     * @memberof MySql
     */
    async getTableColumns(tableName: string): Promise<TableColumn[]> {
        // TABLE_CATALOG: "def",
        // TABLE_SCHEMA: "nolobi",
        // TABLE_NAME: "zona",
        // COLUMN_NAME: "id",
        // ORDINAL_POSITION: 1,
        // COLUMN_DEFAULT: null,
        // IS_NULLABLE: "NO",
        // DATA_TYPE: "int",
        // CHARACTER_MAXIMUM_LENGTH: null,
        // CHARACTER_OCTET_LENGTH: null,
        // NUMERIC_PRECISION: 10,
        // NUMERIC_SCALE: 0,
        // DATETIME_PRECISION: null,
        // CHARACTER_SET_NAME: null,
        // COLLATION_NAME: null,
        // COLUMN_TYPE: "int",
        // COLUMN_KEY: "PRI",
        // EXTRA: "auto_increment",
        // PRIVILEGES: "select,insert,update,references",
        // COLUMN_COMMENT: "",
        // GENERATION_EXPRESSION: "",
        // SRS_ID: null,
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

    async getForeignKeyOf(tableName: string, keyName: string) {
        const query = sql`
            SELECT *
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE
                TABLE_SCHEMA = ${this.databaseName}
                AND REFERENCED_TABLE_NAME = ${tableName}
                AND REFERENCED_COLUMN_NAME = ${keyName}
                AND CONSTRAINT_NAME <> 'PRIMARY'
                AND REFERENCED_TABLE_NAME IS NOT NULL;
            `
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
    private getExistingTable(tableName: string): drizzleMysqlCore.AnyMySqlTable | undefined {
        if (this.mySchema === undefined) {
            return undefined;
        }
        return this.mySchema[tableName];
    }
    /**
     *
     *
     * @private
     * @param {string} tableName
     * @return {*} 
     * @memberof Mysql
     */
    private isTable(tableName: string) {
        return this.tableNameList.includes(tableName);
    }

    /**
     *
     *
     * @param {string[]} tableList
     * @return {} 
     * @memberof MySql
     */
    async buildTableSchema(tableList: string[]) {
        for (const tableName of tableList) {
            const tableColumns = {};

            const columns: TableColumn[] = await this.getTableColumns(tableName);
            for (const column of columns) {
                if (drizzleMysqlCore[column.type]) {
                    if (column.type === 'varchar') {
                        tableColumns[column.name] = drizzleMysqlCore[column.type](column.name, column.char_length);
                    } else if (column.type === 'bigint') {
                        tableColumns[column.name] = drizzleMysqlCore[column.type](column.name, column.num_precision);
                    } else {
                        tableColumns[column.name] = drizzleMysqlCore[column.type](column.name);
                    }
                } else {
                    tableColumns[column.name] = drizzleMysqlCore.text(column.name);
                }

                tableColumns[column.name] = this.setColumnParams(column, tableColumns[column.name], tableName);
            }

            this.mySchema[tableName] = drizzleMysqlCore.mysqlTable(tableName, tableColumns);
        }
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
    private setColumnParams(column: TableColumn, tableColumn: ColumnBuilder, tableName: string) {
        switch (column.column_key) {
            case "PRI":
                // drizzleColumn.primaryKey = true;
                tableColumn.primaryKey();
                break;
            case "PI":
                break;
            case "MUL":
                // console.log({ column, drizzleColumn: drizzleColumn.config }, tableName);
                break;
        }

        if (column.extra === 'auto_increment') {
            // drizzleColumn.config.autoIncrement = true;
        }

        if (column.nullable === 'NO') {
            tableColumn.notNull();
        }

        if (column.column_default !== undefined) {
            tableColumn.default(column.column_default);
        }

        if (column.name.endsWith("_id")) {
            const columnFieldWithoutId = column.name.substring(0, column.name.length - 3);
            if (this.isTable(columnFieldWithoutId)) {
                const referencedTable = this.getExistingTable(columnFieldWithoutId);
                // console.log(`Set references for: ${ tableName }:${ column.name } - ${ columnFieldWithoutId }.id`);
                tableColumn.references(() => { referencedTable[id] });
            }
        }

        return tableColumn;
    }

    /**
     *
     *
     * @param {string} tableName
     * @param {MySqlSchema} mySchema
     * @return {*} 
     * @memberof MySql
    */
    async buildTableRelations(tableList: string[]) {
        for (const tableName of tableList) {
            const relationTable = this.getExistingTable(tableName);

            const foreignKeys = await this.getForeignKeys(tableName);
            const manyForeignKeys = await this.getForeignKeyOf(tableName, "id");

            const tableRelation = relations(relationTable, ({ one, many }) => {
                let relations = {};

                const oneRelations = this.buildOneRelation(tableName, foreignKeys, one);
                const manyRelations = this.buildManyRelation(tableName, manyForeignKeys, many);

                relations = { ...oneRelations, ...manyRelations };

                // const relationsValue = Object.values(relations);
                // if (this.debugMode && tableName && relationsValue.length > 0) {
                //     fs.writeFileSync(`./tmp/${tableName}.json`, JSON.stringify(decycle(relationsValue), null, 2));
                // }

                return relations;
            });

            const relationName = `${tableName} Relations`;

            if (this.mySchema[relationName]) {
                console.log(`Table Relation ${relationName} already exists`);
            }
            this.mySchema[relationName] = tableRelation;
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
    buildOneRelation(tableName: string, foreignKeys, one: CallableFunction) {
        const relationTable = this.getExistingTable(tableName);
        const relations = {};

        for (const foreignKey of foreignKeys) {
            const columnName = foreignKey.COLUMN_NAME;
            const referencedTableName = foreignKey.REFERENCED_TABLE_NAME;
            const referencedColumnName = foreignKey.REFERENCED_COLUMN_NAME;

            const referencedTable = this.getExistingTable(referencedTableName);
            const randomString = (Math.random() + 1).toString(36).substring(7);

            relations[referencedTableName.trim()] = one(referencedTable, {
                fields: [relationTable[columnName]],
                references: [referencedTable[referencedColumnName]],
                // relationName: `${ referencedTableName }_${ randomString } `
                relationName: referencedTableName
            })
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
    buildManyRelation(tableName: string, manyForeignKeys, many: CallableFunction) {
        const relations = {};

        for (const foreignKey of Object.values(manyForeignKeys)) {
            const TableName = foreignKey.TABLE_NAME;
            const columnName = foreignKey.COLUMN_NAME;
            const ReferencedTableName = foreignKey.REFERENCED_TABLE_NAME;
            const ReferencedColumnName = foreignKey.REFERENCED_COLUMN_NAME;
            const pluralizedName = pluralize(TableName).trim();

            const relatedTable = this.getExistingTable(TableName);
            const randomString = (Math.random() + 1).toString(36).substring(7);

            // // Test with a fixed relation name
            const fixedRelationName = `${TableName}_relation_${randomString} `;
            if (relatedTable !== undefined) {
                relations[pluralizedName] = many(relatedTable, {
                    relationName: TableName,
                });
            }
        }

        return relations;
    }
}