import { MySqlTable } from "drizzle-orm/mysql-core";
import { TableColumn, TableInfo } from "drizzle-schema-generator/src/types/mysqlTypes";

export interface AdapterInterface {

    // connection();
    // getConnection();
    // extractSchema();
    // getTableList();
    // getPrimaryKeys(tableName: string): Promise<TableInfo[]>;
    // getForeignKeys(tableName: string): Promise<TableInfo[]>;
    // getTableColumns(tableName: string): Promise<TableColumn[]>;
    // buildTableSchema(tableList: string[]): Promise<void>;
    // buildTableRelations(tableList: string[]);
    // setColumnParams(column: TableColumn, drizzleColumn, tableName: string);
}