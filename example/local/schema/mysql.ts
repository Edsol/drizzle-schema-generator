import { int, text, mysqlSchema, primaryKey } from "drizzle-orm/mysql-core";
import { relations } from 'drizzle-orm';

export const mySchema = mysqlSchema("nolobi")



export const filiale = mySchema.table('filiale', {
    id: int("id").autoincrement().primaryKey(),
    nome: text('nome'),
    codice: text('codice'),
    responsabile_dipendente_id: int("responsabile_dipendente_id"),
})

export const azienda = mySchema.table('azienda', {
    id: int("id").autoincrement().primaryKey(),
    nome: text('nome'),
    identificativo: text('identificativo')
})

export const dipendente = mySchema.table("dipendente", {
    id: int("id").primaryKey().autoincrement(),
    nome: text("nome"),
    cognome: text("cognome"),
    filiale_id: int("filiale_id"),
    azienda_id: int("azienda_id"),
});

export const responsabileFilialeRelations = relations(filiale, ({ one, many }) => ({
    dipendente: one(dipendente, {
        fields: [filiale.responsabile_dipendente_id],
        references: [dipendente.id],
        relationName: 'asdlasd'
    }),
    // dipendentes: many(dipendente, {
    //     relationName: 'kodhf34'
    // })
}));

export const dipendenteRelations = relations(dipendente, ({ one, many }) => ({
    // filiale: one(filiale, {
    //     fields: [dipendente.filiale_id],
    //     references: [filiale.id],
    //     relationName: 'kodhf34'
    // }),
    azienda: one(azienda, {
        fields: [dipendente.azienda_id],
        references: [azienda.id],
        relationName: "dipendente_azienda"
    }),
    filiales: many(filiale, {
        relationName: 'asdlasd'
    })
}));

export const aziendaRelations = relations(azienda, ({ many }) => ({
    dipendenti: many(dipendente, {
        relationName: 'dipendente_azienda',
    }),
}));



/////////////!SECTION

export const attivita = mySchema.table("attivita", {
    id: int("id").primaryKey().autoincrement(),
    modulo: text("modulo"),
    data_creazione: text("data_creazione"),
});

export const attivitaRelations = relations(attivita, ({ many }) => ({
    attivitaIntervento: many(attivitaIntervento),
}));

export const intervento = mySchema.table("intervento", {
    id: int("id").primaryKey().autoincrement(),
    last_update: text("last_update"),
    pronto_cantiere: text("pronto_cantiere"),
});

export const interventoRelations = relations(intervento, ({ many }) => ({
    attivitaIntervento: many(attivitaIntervento),
}));

export const attivitaIntervento = mySchema.table('attivita_intervento', {
    attivita_id: int('attivita_id')
        .notNull()
        .references(() => attivita.id),
    intervento_id: int('intervento_id')
        .notNull()
        .references(() => intervento.id),
},
    (t) => ({
        pk: primaryKey({ columns: [t.attivita_id, t.intervento_id] }),
    }),
);

export const attivitaInterventoRelations = relations(attivitaIntervento, ({ one }) => ({
    attivita: one(attivita, {
        fields: [attivitaIntervento.attivita_id],
        references: [attivita.id],
    }),
    intervento: one(intervento, {
        fields: [attivitaIntervento.intervento_id],
        references: [intervento.id],
    }),
}));