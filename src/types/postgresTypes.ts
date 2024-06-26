export type AdapterConnection = {
    dbType: string,
    host: string,
    port: number;
    user: string,
    password: string,
    database: string,
    schema: string,
}
export interface TableColumn {
    table_catalog: string,
    table_schema: string,
    table_name: string,
    column_name: string,
    ordinal_position: number,
    column_default: unknown,
    is_nullable: "YES" | "NO",
    data_type: string,
    character_maximum_length?: number,
    character_octet_length?: number,
    numeric_precision?: number,
    numeric_precision_radix?: number,
    numeric_scale?: number,
    datetime_precision?: number,
    interval_type?: string,
    interval_precision?: number,
    character_set_catalog?: string,
    character_set_schema?: string,
    character_set_name?: string,
    collation_catalog?: string,
    collation_schema?: string,
    collation_name?: string,
    domain_catalog?: string,
    domain_schema?: string,
    domain_name?: string,
    udt_catalog: string,
    udt_schema: string,
    udt_name: string,
    scope_catalog?: string,
    scope_schema?: string,
    scope_nam?: string,
    maximum_cardinality?: number,
    dtd_identifier: string,
    is_self_referencing: string,
    is_identity: string,
    identity_generation?: string,
    identity_start?: string,
    identity_increment?: string,
    identity_maximum?: string,
    identity_minimum?: string,
    identity_cycle: string,
    is_generated: string,
    generation_expression?: string,
    is_updatable: string,
    constraint_type: string,
}

export type ForeignKey = {
    constraint_catalog: string,
    constraint_schema: string,
    constraint_name: string,
    table_catalog: string,
    table_schema: string,
    table_name: string,
    column_name: string,
    ordinal_position: number,
    position_in_unique_constraint?: number,
}