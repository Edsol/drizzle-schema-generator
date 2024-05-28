# Example

## use local schema:

uses the pattern in the path `/example/local/schema/`.

### create the schema

copy and initialize the schema from the example file:

- `/example/local/schema/mysql.ts.example` for mysql
- `/example/local/schema/postgres.ts.example` for postgres

### run

```bash
npm run local:mysql
# or
npm run local:postgres
```

## use dynamic schema:

the schema will be generated automatically from the database.

### create `.env` file

copy and initialize the env file from `/example/.env.example`

### run

```bash
npm run auto:mysql
#or
npm run auto:postgres
```
