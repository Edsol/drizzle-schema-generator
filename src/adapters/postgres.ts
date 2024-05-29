import { relations, ColumnBuilder, Many, One } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import * as pgCore from "drizzle-orm/pg-core";
import postgres from 'postgres';

import { TableColumn, ForeignKey } from "../types/postgresTypes";
import { AdapterConnection } from "drizzle-schema-generator/src/types/commonTypes";
import { AdapterInterface } from "./adapterInterface";
const pluralize = require('pluralize');

export default class Postgres implements AdapterInterface {

    protected debugMode = false;
    connection: postgres;
    databaseName?: string;
    dbSchema?: string;
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
        const connectionString = `postgres://${this.connectionParams.user}:${this.connectionParams.password}@${this.connectionParams.host}:${this.connectionParams.port}/${this.connectionParams.database}`;

        if (this.debugMode) {
            console.log({ connectionString });
        }
        this.connection = postgres('', {
            host: this.connectionParams.host,
            port: this.connectionParams.port,
            database: this.connectionParams.database,
            username: this.connectionParams.user,
            password: this.connectionParams.password
        });

        this.db = drizzle(this.connection);
        this.databaseName = this.connectionParams.database;
        this.dbSchema = this.connectionParams.schema;
    }
    /**
     *
     *
     * @return {*} 
     * @memberof Postgres
     */
    getConnection() {
        return this.connection;
    }

    /**
 *
 *
 * @param {string} [databaseName]
 * @return {*} 
 * @memberof Postgres
 */
    async extractSchema(databaseName?: string, toBeExcluded?: Array<string>) {
        await this.connect();

        this.schema = new pgCore.PgSchema(databaseName ?? this.dbSchema ?? 'schema');
        const excluded: Array<String> = [];
        excluded.concat(toBeExcluded);

        if (this.debugMode) console.time("extractSchema");

        await this.buildTables(excluded);
        await this.buildTableRelations();

        if (this.debugMode) console.timeEnd('extractSchema');
        return this.schema;
    }

    /**
     *
     *
     * @param {Array<string>} [toBeExcluded]
     * @return {*} 
     * @memberof Postgres
     */
    async getAllTableColumns(toBeExcluded?: Array<string>): Promise<TableColumn[]> {
        if (this.debugMode) console.time("getAllTableColumns")
        const tables = toBeExcluded?.map((table) => `'${table}'`);

        // TODO: exclude tables
        const results = await this.connection`
            SELECT c.*, tc.constraint_type
            FROM information_schema.columns c
            JOIN information_schema.table_constraints tc
                ON c.table_name = tc.table_name
            WHERE
                c.table_schema = ${this.dbSchema}
               
            ORDER BY c.table_name ASC, ordinal_position ASC;
        `;

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

        const results = await this.connection`
            SELECT
                conrelid::regclass AS table_name,
                a.attname AS column_name,
                confrelid::regclass AS foreign_table_name,
                af.attname AS foreign_column_name
            FROM
                pg_constraint AS c
            JOIN
                pg_class AS cl
                ON c.conrelid = cl.oid
            JOIN
                pg_attribute AS a
                ON a.attnum = ANY(c.conkey) AND a.attrelid = cl.oid
            JOIN
                pg_class AS clf
                ON c.confrelid = clf.oid
            JOIN
                pg_attribute AS af
                ON af.attnum = ANY(c.confkey) AND af.attrelid = clf.oid
            WHERE
                c.contype = 'f'
                AND cl.relnamespace = ${this.dbSchema}::regnamespace
                AND cl.relname = ${tableName};
            `;
        return results;
    }
    /**
     *
     *
     * @param {string} tableName
     * @param {string} keyName
     * @return {*}  {Promise<ForeignKey[]>}
     * @memberof Postgres
     */
    async getForeignKeysOf(tableName: string, keyName: string): Promise<ForeignKey[]> {
        const results = await this.connection`
            SELECT
                conname AS constraint_name,
                conrelid::regclass AS table_name,
                a.attname AS column_name,
                confrelid::regclass AS foreign_table_name,
                af.attname AS foreign_column_name
            FROM
                pg_constraint AS c
            JOIN
                pg_class AS cl
                ON c.conrelid = cl.oid
            JOIN
                pg_attribute AS a
                ON a.attnum = ANY(c.conkey) AND a.attrelid = cl.oid
            JOIN
                pg_class AS clf
                ON c.confrelid = clf.oid
            JOIN
                pg_attribute AS af
                ON af.attnum = ANY(c.confkey) AND af.attrelid = clf.oid
            WHERE
                c.contype = 'f'
                AND clf.relnamespace = ${this.dbSchema}::regnamespace
                AND clf.relname = ${tableName};    
        `;
        return results;
    }

    /**
 *
 *
 * @private
 * @param {string} tableName
 * @return {*}  {MySqlTable}
 * @memberof Postgres
 */
    private getExistingTable(tableName: string): pgCore.AnyPgTable {
        return this.schema[tableName];
    }
    /**
     *
     *
     * @private
     * @param {string} tableName
     * @return {boolean} 
     * @memberof Postgres
     */
    private tableExists(tableName: string): boolean {
        return this.getExistingTable(tableName) !== undefined;
    }

    /**
     *
     *
     * @param {Array<string>} [toBeExcluded]
     * @memberof Postgres
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

            const currentTableName = column.table_name;

            columns.push(column);

            // TODO: REFACTORING
            if (nextIndex < allColumnsList.length) {
                if (currentTableName !== nextColumn.table_name) {
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
     * @memberof Postgres
     */
    private async prepareTable(tableName: string, columns: TableColumn[]) {
        const tableColumns = {};
        for (const column of columns) {
            const columnName = column.column_name;

            if (pgCore[column.data_type]) {
                if (column.data_type === 'varchar') {
                    tableColumns[columnName] = pgCore[column.data_type](columnName, column.character_maximum_length);
                } else if (column.type === 'bigint') {
                    tableColumns[columnName] = pgCore[column.data_type](columnName, column.numeric_precision);
                } else {
                    tableColumns[columnName] = pgCore[column.data_type](columnName);
                }
            } else {
                tableColumns[columnName] = pgCore.text(columnName);
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
     * @param {ColumnBuilder} tableColumn
     * @param {string} tableName
     * @param {TableInfo} [foreignKey]
     * @return {*} 
     * @memberof Postgres
     */
    private async setColumnParams(column: TableColumn, tableColumn: ColumnBuilder, tableName: string) {

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
            const manyForeignKeys = await this.getForeignKeysOf(tableName, "id");

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
            const relationColumnName = foreignKey.column_name;
            let fieldName = relationColumnName;

            if (relationColumnName.endsWith("_id")) {
                fieldName = relationColumnName.slice(0, -3);
            }
            // singularize relation name
            fieldName = pluralize.singular(fieldName);

            const referencedTableName = foreignKey.foreign_table_name;
            const referencedColumnName = foreignKey.foreign_column_name;

            const referencedTable = this.getExistingTable(referencedTableName);
            const relationName = `${tableName}_${relationColumnName}`;

            // skip if referencedTable not exists
            if (referencedTable[referencedColumnName] && relationTable[relationColumnName]) {
                const r = (Math.random() + 1).toString(36).substring(7);
                relations[`_${fieldName}_${r}`] = new One(relationTable, referencedTable, {
                    fields: [relationTable[relationColumnName]],
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
            const ReferencedTableName = foreignKey.table_name;
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