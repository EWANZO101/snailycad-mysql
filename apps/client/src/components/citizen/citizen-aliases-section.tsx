import * as React from "react";
import { Button, Loader, TextField } from "@snailycad/ui";
import { useTranslations } from "use-intl";
import useFetch from "lib/useFetch";

export interface CitizenAlias {
  id: string;
  citizenId: string;
  name: string;
  surname: string;
  createdAt: Date | string;
}

interface Props {
  citizenId: string;
  initialAliases?: CitizenAlias[];
}

/**
 * Lets the owner of a citizen add/remove aliases ("also known as").
 * Aliases are searchable in the LEO name search.
 */
export function CitizenAliasesSection({ citizenId, initialAliases }: Props) {
  const t = useTranslations("Citizen");
  const common = useTranslations("Common");
  const { state, execute } = useFetch();

  const [aliases, setAliases] = React.useState<CitizenAlias[]>(initialAliases ?? []);
  const [name, setName] = React.useState("");
  const [surname, setSurname] = React.useState("");
  const [errors, setErrors] = React.useState<{ name?: string; surname?: string }>({});

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();

    const { json } = await execute<CitizenAlias, { name: string; surname: string }>({
      path: `/citizen/${citizenId}/aliases`,
      method: "POST",
      data: { name, surname },
      helpers: {
        setFieldError: (field: string, message: string | undefined) =>
          setErrors((prev) => ({ ...prev, [field]: message })),
      } as any,
    });

    if (json?.id) {
      setAliases((prev) => [...prev, json]);
      setName("");
      setSurname("");
      setErrors({});
    }
  }

  async function handleDelete(alias: CitizenAlias) {
    const { json } = await execute<boolean>({
      path: `/citizen/${citizenId}/aliases/${alias.id}`,
      method: "DELETE",
    });

    if (json === true) {
      setAliases((prev) => prev.filter((v) => v.id !== alias.id));
    }
  }

  return (
    <section className="card p-4 mt-5" aria-labelledby="citizen-aliases-title">
      <h2 id="citizen-aliases-title" className="text-xl font-semibold">
        {t("aliases")}
      </h2>
      <p className="text-neutral-700 dark:text-gray-400 my-1">{t("aliasesDescription")}</p>

      {aliases.length <= 0 ? (
        <p className="my-2">{t("noAliases")}</p>
      ) : (
        <ul className="flex flex-col gap-2 my-3">
          {aliases.map((alias) => (
            <li
              key={alias.id}
              className="flex items-center justify-between rounded-md px-3 py-2 bg-gray-100 dark:bg-secondary"
            >
              <span>
                {alias.name} {alias.surname}
              </span>
              <Button
                size="xs"
                variant="danger"
                type="button"
                disabled={state === "loading"}
                onPress={() => handleDelete(alias)}
              >
                {common("delete")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <TextField
          className="flex-1"
          label={t("name")}
          name="name"
          value={name}
          errorMessage={errors.name}
          onChange={(value) => setName(value)}
          isRequired
        />
        <TextField
          className="flex-1"
          label={t("surname")}
          name="surname"
          value={surname}
          errorMessage={errors.surname}
          onChange={(value) => setSurname(value)}
          isRequired
        />
        <Button
          className="sm:mt-7 flex items-center gap-2"
          type="submit"
          disabled={state === "loading" || !name.trim() || !surname.trim()}
        >
          {state === "loading" ? <Loader /> : null}
          {t("addAlias")}
        </Button>
      </form>
    </section>
  );
}
