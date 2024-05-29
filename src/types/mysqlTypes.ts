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
    TABLE_CATALOG: string,
    TABLE_SCHEMA: string,
    TABLE_NAME: string,
    COLUMN_NAME: string,
    ORDINAL_POSITION: number,
    COLUMN_DEFAULT?: unknown,
    IS_NULLABLE: string,
    DATA_TYPE: string,
    CHARACTER_MAXIMUM_LENGTH?: number,
    CHARACTER_OCTET_LENGTH?: number,
    NUMERIC_PRECISION?: number,
    NUMERIC_SCALE?: number,
    DATETIME_PRECISION?: unknown,
    CHARACTER_SET_NAME?: unknown,
    COLLATION_NAME?: unknown,
    COLUMN_TYPE: string,
    COLUMN_KEY: string,
    EXTRA: string,
    PRIVILEGES: string,
    COLUMN_COMMENT: string,
    GENERATION_EXPRESSION: string,
    SRS_ID: null,
    CONSTRAINT_TYPE: string,
}