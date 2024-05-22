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
export type TableInfo = {
    CONSTRAINT_NAME: string,
    TABLE_NAME: string,
    COLUMN_NAME: string,
    REFERENCED_TABLE_NAME: string,
    REFERENCED_COLUMN_NAME: string,
    CONSTRAINT_CATALOG: string,
    CONSTRAINT_SCHEMA: string,
    TABLE_CATALOG: string,
    TABLE_SCHEMA: string,
    ORDINAL_POSITION: number,
    POSITION_IN_UNIQUE_CONSTRAINT: string,
    REFERENCED_TABLE_SCHEMA: string,
}

export type ForeignKey = {
    contraint_catalog: string,
    contraint_schema: string,
    name: string,
    table_catalog: string,
    table_schema: string,
    table_name: string,
    column_name: string,
    ordinal_position: number,
    referenced_table_schema: string,
    referenced_table_name: string;
    referenced_column_name: string
}


export type TableColumn = {
    name: string,
    type: string,
    column_default: unknown,
    column_key: "PRI" | "UNI" | "MUL",
    // 'PRI' primary key
    // 'UNI' unique key
    // "MUL" multiple
    nullable: "NO" | "YES",
    char_length: number,
    num_precision: number,
    datetime_precision: unknown,
    extra: string,
    comment: string,
    table_name: string
}

export type AdapterConnection = {
    dbType: string,
    host: string,
    user: string,
    password: string,
    database: string,
}