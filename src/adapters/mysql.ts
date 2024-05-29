import { sql, relations, ColumnBuilder, Many, One } from "drizzle-orm";
import { MySql2Database, MySqlQueryResult } from "drizzle-orm/mysql2";
import * as mysqlCore from "drizzle-orm/mysql-core";
import { Connection } from "mysql2/promise";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

import { TableColumn, TableInfo, ForeignKey } from "../types/mysqlTypes";
import { AdapterConnection } from "drizzle-schema-generator/src/types/commonTypes";
import { AdapterInterface } from "./adapterInterface";
const pluralize = require('pluralize');

export default class Mysql implements AdapterInterface {

    protected debugMode = false;
    connection: Connection;
    databaseName?: string;
    db: MySql2Database;
    tableNameList: string[] = [];
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
     * @param {string} [databaseName]
     * @return {*} 
     * @memberof Mysql
     */
    async extractSchema(databaseName?: string, toBeExcluded?: Array<string>) {
        await this.connect();

        this.schema = mysqlCore.mysqlDatabase(databaseName ?? this.databaseName ?? 'schema');
        const exluded = await this.getPmaTables();
        exluded.concat(toBeExcluded);

        if (this.debugMode) console.time("extractSchema");

        await this.buildTables(exluded);
        await this.buildTableRelations();

        if (this.debugMode) console.timeEnd('extractSchema');
        return this.schema;
    }


    /**
     *get phpmyadmin table list
     *
     * @private
     * @return {*} 
     * @memberof Mysql
     */
    private async getPmaTables() {
        const query = sql`
        SELECT
            TABLE_NAME 
        FROM
        INFORMATION_SCHEMA.TABLES 
        WHERE 
            TABLE_SCHEMA LIKE ${this.databaseName} 
            AND TABLE_NAME LIKE '%pma__%'
        `;
        const [results] = await this.db.execute(query);
        const result = [];

        for (const table of Object.values(results)) {
            result.push(table['TABLE_NAME']);
        }
        return result;
    }
    /**
     *
     *
     * @param {Array<string>} [toBeExcluded]
     * @return {*} 
     * @memberof Mysql
     */
    async getAllTableColumns(toBeExcluded?: Array<string>) {
        if (this.debugMode) console.time("getAllTableColumns")

        const tables = toBeExcluded?.map((table) => `'${table}'`);

        const query = `
            SELECT c.*, tc.constraint_type
            FROM information_schema.columns c
            JOIN information_schema.table_constraints tc
                ON c.table_name = tc.table_name
            WHERE
                c.table_schema = '${this.databaseName}'
            
            ORDER BY c.table_name ASC, ordinal_position ASC;
        `;
        const [results] = await this.connection.query(query);

        if (this.debugMode) console.timeEnd('getAllTableColumns');
        return results;
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
                AND referenced_table_name IS NOT NULL;
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
        FROM 
            INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
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
        return this.getExistingTable(tableName) !== undefined;
    }

    /**
     *
     *
     * @param {string[]} tableList
     * @return {} 
     * @memberof MySql
     */
    async buildTables(toBeExcluded?: Array<string>) {
        const timeLabel = 'buildTables time';
        if (this.debugMode) console.time(timeLabel)

        const allColumnsList: TableColumn[] = await this.getAllTableColumns(toBeExcluded);

        let columns: TableColumn[] = [];
        for (let i = 0; i < allColumnsList.length; i++) {
            const nextIndex = i + 1;
            const column = allColumnsList[i];
            const nextColumn = allColumnsList[nextIndex];

            const currentTableName = column.TABLE_NAME;

            columns.push(column);

            // TODO: REFACTORING
            if (nextIndex < allColumnsList.length) {
                if (currentTableName !== nextColumn.TABLE_NAME) {
                    this.tableNameList.push(currentTableName);
                    await this.prepareTable(currentTableName, columns);
                    columns = [];
                }
            } else {
                this.tableNameList.push(currentTableName);
                await this.prepareTable(currentTableName, columns);
                columns = [];
            }
        }
        if (this.debugMode) console.timeEnd(timeLabel)
    }
    /**
     *
     *
     * @private
     * @param {string} tableName
     * @param {TableColumn[]} columns
     * @memberof Mysql
     */
    private async prepareTable(tableName: string, columns: TableColumn[]) {
        const tableColumns = {};
        for (const column of columns) {
            const columnName = column.COLUMN_NAME;

            if (mysqlCore[column.COLUMN_TYPE]) {
                if (column.COLUMN_TYPE === 'varchar') {
                    tableColumns[columnName] = mysqlCore[column.COLUMN_TYPE](columnName, column.CHARACTER_MAXIMUM_LENGTH);
                } else if (column.COLUMN_TYPE === 'bigint') {
                    tableColumns[columnName] = mysqlCore[column.COLUMN_TYPE](columnName, column.NUMERIC_PRECISION);
                } else {
                    tableColumns[columnName] = mysqlCore[column.COLUMN_TYPE](columnName);
                }
            } else {
                tableColumns[columnName] = mysqlCore.text(columnName);
            }

            tableColumns[columnName] = await this.setColumnParams(column, tableColumns[columnName], tableName);
        }
        this.schema[tableName] = this.schema.table(tableName, tableColumns);
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

        switch (column.constraint_type) {
            case "PRIMARY KEY":
                tableColumn.primaryKey();
                break;
        }

        if (column.extra === 'auto_increment') {
            tableColumn.autoincrement();
        }

        if (column.is_nullable === 'NO') {
            tableColumn.notNull();
        }

        if (column.column_default !== undefined && column.column_default !== '') {
            tableColumn.default(column.column_default);
        }
        return tableColumn;
    }

    /**
     *
     *
     * @param {string[]} tableList
     * @memberof Mysql
     */
    async buildTableRelations() {
        const timeLabel = 'buildTableRelations';
        if (this.debugMode) console.time(timeLabel)

        for (const tableName of this.tableNameList) {
            const relationTable = this.getExistingTable(tableName);

            if (relationTable === undefined) {
                continue;
            }

            const foreignKeys = await this.getForeignKeys(tableName);
            const manyForeignKeys = await this.getForeignKeyOf(tableName, "id");

            const oneRelations = await this.buildOneRelation(tableName, foreignKeys);
            const manyRelations = await this.buildManyRelation(tableName, manyForeignKeys);

            const relationParams = () => {
                return { ...oneRelations, ...manyRelations };
            };

            const tableRelation = relations(relationTable, relationParams);

            const relationName = `${tableName}Relations`;
            this.schema[relationName] = tableRelation;
        }

        if (this.debugMode) console.timeEnd(timeLabel)
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
    private async buildOneRelation(tableName: string, foreignKeys: ForeignKey[]) {
        // current table
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
            const relationName = `${tableName}_${columnName}`;
            // skip if referencedTable not exists
            if (referencedTable[referencedColumnName] && relationTable && relationTable[columnName]) {
                relations[`_${fieldName}`] = new One(relationTable, referencedTable, {
                    fields: [relationTable[columnName]],
                    references: [referencedTable[referencedColumnName]],
                    relationName: relationName
                }, true);
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
    private async buildManyRelation(tableName: string, manyForeignKeys: ForeignKey[]) {
        const relationTable = this.getExistingTable(tableName);
        const relations = {};

        for (const foreignKey of manyForeignKeys) {
            const TableName = foreignKey.table_name;

            const columnName = foreignKey.column_name;
            const ReferencedTableName = foreignKey.referenced_table_name;
            const relatedTable = this.getExistingTable(TableName);

            const pluralizedName = pluralize(TableName).trim();
            const relationName = `${TableName}_${columnName}`;

            if (relatedTable && this.tableExists(TableName)) {
                relations[pluralizedName] = new Many(relationTable, relatedTable, {
                    relationName: relationName
                });
            }


        }
        return relations;
    }
}