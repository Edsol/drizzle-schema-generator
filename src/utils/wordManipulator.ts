export function pluralize(word: string): string {
    // Regola per sostituire la vocale finale
    if (word.endsWith("a") && !word.endsWith("ia") && !word.endsWith("ga")) {
        return word.slice(0, -1) + "e";
    }
    if (word.endsWith("o") && !word.endsWith("po")) {
        return word.slice(0, -1) + "i";
    }
    if (word.endsWith("e")) {
        if (
            word.endsWith("ge") ||
            word.endsWith("le")
        ) {
            return word;
        }
        return word.slice(0, -1) + "i";
    }

    // Regola per sostituire le consonanti finali
    if (word.endsWith("co")) {
        return word.slice(0, -i) + "chi";
    }
    if (word.endsWith("go")) {
        return word.slice(0, -2) + "ghi";
    }

    // Aggiungi altre regole se necessario

    // Se nessuna regola specifica si applica, ritorna la parola così com'è
    return word;
}

export function pluralizeSnakeCase(input: string) {
    // Scomponi la stringa in parole separate
    const words = input.split('_');

    // Applica la pluralizzazione a ciascuna parola e riassembla la stringa
    const pluralizedWords = words.map(word => pluralize(word));

    // Unisci le parole per formare la stringa finale
    return pluralizedWords.join('_');
}

export function truncateForeignKey(field: string) {
    return field.replace("_id", "");
}