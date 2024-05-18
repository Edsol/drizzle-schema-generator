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

// 'PRI' primary key
// 'UNI' unique key
// "MUL" multiple
export type TableColumn = {
    // Field: string,
    // Type: string,
    // Null: "NO" | "YES",
    // Key: "PRI" | "UNI" | "MUL",
    // Default?: string,
    // Extra: string,

    name: string,
    type: string,
    column_default: unknown,
    column_key: "PRI" | "UNI" | "MUL",
    nullable: "NO" | "YES",
    char_length: number,
    num_precision: number,
    datetime_precision: unknown,
    extra: string,
    comment: string,
}

export type AdapterConnection = {
    dbType: string,
    host: string,
    user: string,
    password: string,
    database: string,
}