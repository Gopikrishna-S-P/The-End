package com.recoverpro.server.service.importer;

import java.util.List;

/**
 * One column a processor understands. This is the single source of truth for three things
 * that used to drift apart: what {@code mapRow} reads, what the downloadable template
 * contains, and what the upfront header check enforces.
 *
 * @param name      canonical header, and the column recorded against any error
 * @param label     human wording used in error messages and template docs
 * @param required  a file missing this column is rejected before any row is processed
 * @param aliases   other spellings accepted for {@code name}; matching ignores case,
 *                  spaces, underscores and hyphens, but is otherwise exact
 * @param example   sample value written into the template's example row
 */
public record ImportFieldSpec(
        String name,
        String label,
        boolean required,
        List<String> aliases,
        String example
) {

    public static ImportFieldSpec required(String name, String label, String example, String... aliases) {
        return new ImportFieldSpec(name, label, true, List.of(aliases), example);
    }

    public static ImportFieldSpec optional(String name, String label, String example, String... aliases) {
        return new ImportFieldSpec(name, label, false, List.of(aliases), example);
    }

    /** The canonical name plus every alias, for matching against a file's headers. */
    public String[] allNames() {
        String[] all = new String[aliases.size() + 1];
        all[0] = name;
        for (int i = 0; i < aliases.size(); i++) {
            all[i + 1] = aliases.get(i);
        }
        return all;
    }
}
