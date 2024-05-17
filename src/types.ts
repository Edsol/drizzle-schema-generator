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

export type TableColumn = {
    Field: string,
    Type: string,
    Null: string,
    Key: "PI" | "UNI" | "MUL",
    Default?: string,
    Extra: string,
}

export type AdapterConnection = {
    dbType: string,
    host: string,
    user: string,
    password: string,
    database: string,
}