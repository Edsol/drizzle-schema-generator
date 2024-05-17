import { MySqlTable } from "drizzle-orm/mysql-core";
import { TableColumn, TableInfo } from "../types";

export interface AdapterInterface {

    connection();
    getConnection();
    extractSchema(tableName?: string);
    getTableList();
    getPrimaryKeys(tableName: string): Promise<TableInfo[]>;
    getForeignKeys(tableName: string): Promise<TableInfo[]>;
    getTableColumns(tableName: string): Promise<QueryResult>;
    buildTableRelations(tableName: string);
    buildTableSchema(tableName: string): Promise<MySqlTable>;
}