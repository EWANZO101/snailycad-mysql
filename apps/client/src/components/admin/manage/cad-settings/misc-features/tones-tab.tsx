import * as React from "react";
import { TabsContent } from "@radix-ui/react-tabs";
import { useTranslations } from "use-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ActiveToneType, type DepartmentValue } from "@snailycad/types";
import { Alert, Button, Loader, SelectField, TextField } from "@snailycad/ui";
import { SettingsTabs } from "components/admin/cad-settings/layout";
import { type TonePreset, useTonePresets } from "components/tones/tone-presets";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { BUILT_IN_TONE_NAMES, builtInSound, isBuiltInSound, playToneSound } from "lib/tone-sounds";
import useFetch from "lib/useFetch";

const CUSTOM_SOUND = "custom";

const EMPTY_FORM = {
  name: "",
  type: ActiveToneType.SHARED as ActiveToneType,
  departmentId: null as string | null,
  soundChoice: builtInSound("two-tone"),
  customUrl: "",
  position: 0,
};

/** admins configure the tones dispatch can play (Dispatch > Tones > Play a tone) */
export function TonesTab() {
  const t = useTranslations("Tones");
  const common = useTranslations("Common");
  const { TONES } = useFeatureEnabled();
  const { execute, state } = useFetch();
  const queryClient = useQueryClient();
  const { data: presets = [], isPending } = useTonePresets();

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(EMPTY_FORM);

  const departments = useQuery({
    queryKey: ["admin", "values", "department"],
    queryFn: async () => {
      const { json } = await execute<{ values: DepartmentValue[] }[]>({
        path: "/admin/values/department?includeAll=true",
        noToast: true,
      });
      return Array.isArray(json) ? (json[0]?.values ?? []) : [];
    },
  });

  const sound = form.soundChoice === CUSTOM_SOUND ? form.customUrl.trim() : form.soundChoice;
  const departmentOptions = (departments.data ?? [])
    .filter((department) => form.type === ActiveToneType.SHARED || department.type === form.type)
    .map((department) => ({ value: department.id, label: department.value.value }));

  function update(patch: Partial<typeof EMPTY_FORM>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleEdit(preset: TonePreset) {
    setEditingId(preset.id);
    setForm({
      name: preset.name,
      type: preset.type,
      departmentId: preset.departmentId,
      soundChoice: isBuiltInSound(preset.sound) ? preset.sound : CUSTOM_SOUND,
      customUrl: isBuiltInSound(preset.sound) ? "" : preset.sound,
      position: preset.position,
    });
  }

  function handleCancel() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.name.trim() || !sound) return;

    const { json } = await execute<TonePreset>({
      path: editingId ? `/tone-presets/${editingId}` : "/tone-presets",
      method: editingId ? "PUT" : "POST",
      data: {
        name: form.name.trim(),
        sound,
        type: form.type,
        departmentId: form.departmentId,
        position: form.position,
      },
    });

    if (json?.id) {
      handleCancel();
      await queryClient.invalidateQueries({ queryKey: ["tone-presets"] });
    }
  }

  async function handleDelete(preset: TonePreset) {
    if (!window.confirm(t("confirmDelete", { name: preset.name }))) return;

    const { json } = await execute<boolean>({
      path: `/tone-presets/${preset.id}`,
      method: "DELETE",
    });

    if (json) {
      if (editingId === preset.id) handleCancel();
      await queryClient.invalidateQueries({ queryKey: ["tone-presets"] });
    }
  }

  const typeLabels: Record<ActiveToneType, string> = {
    [ActiveToneType.SHARED]: t("typeShared"),
    [ActiveToneType.LEO]: t("leoTones"),
    [ActiveToneType.EMS_FD]: t("emsFdTones"),
  };

  return (
    <TabsContent value={SettingsTabs.TonePresets} className="mt-3">
      <header className="mb-4">
        <h2 className="text-2xl font-semibold">{t("tonePresets")}</h2>
        <p className="mt-1 text-neutral-600 dark:text-gray-400">{t("tonePresetsIntro")}</p>
      </header>

      {TONES ? null : (
        <Alert className="mb-4" type="warning" title={t("tonesDisabledTitle")}>
          <p>{t("tonesDisabledMessage")}</p>
        </Alert>
      )}

      <section className="card p-4 mb-6">
        <h3 className="font-semibold text-lg mb-2">{editingId ? t("editTone") : t("addTone")}</h3>

        <div className="grid gap-x-3 md:grid-cols-2">
          <TextField
            label={common("name")}
            value={form.name}
            onChange={(name) => update({ name })}
            maxLength={255}
            isRequired
          />
          <SelectField
            label={t("usedBy")}
            selectedKey={form.type}
            onSelectionChange={(value) =>
              update({
                type: (value as ActiveToneType) ?? ActiveToneType.SHARED,
                departmentId: null,
              })
            }
            options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))}
          />
          <SelectField
            label={t("department")}
            isOptional
            isClearable
            selectedKey={form.departmentId}
            onSelectionChange={(value) => update({ departmentId: value ? String(value) : null })}
            options={departmentOptions}
          />
          <SelectField
            label={t("sound")}
            selectedKey={form.soundChoice}
            onSelectionChange={(value) =>
              update({ soundChoice: String(value ?? EMPTY_FORM.soundChoice) })
            }
            options={[
              ...BUILT_IN_TONE_NAMES.map((name) => ({
                value: builtInSound(name),
                label: t(`builtin_${name}`),
              })),
              { value: CUSTOM_SOUND, label: t("customSound") },
            ]}
          />
          {form.soundChoice === CUSTOM_SOUND ? (
            <div className="md:col-span-2">
              <TextField
                label={t("customSoundUrl")}
                value={form.customUrl}
                onChange={(customUrl) => update({ customUrl })}
                placeholder="https://example.com/tone.mp3"
              />
              <p className="-mt-2 mb-3 text-sm text-neutral-600 dark:text-gray-400">
                {t("customSoundUrlDescription")}
              </p>
            </div>
          ) : null}
        </div>

        <footer className="flex flex-wrap justify-end gap-2 mt-2">
          <Button variant="cancel" isDisabled={!sound} onPress={() => playToneSound(sound)}>
            {t("preview")}
          </Button>
          {editingId ? (
            <Button variant="cancel" onPress={handleCancel}>
              {common("cancel")}
            </Button>
          ) : null}
          <Button
            className="flex items-center gap-2"
            isDisabled={!form.name.trim() || !sound || state === "loading"}
            onPress={handleSave}
          >
            {state === "loading" ? <Loader /> : null}
            {editingId ? common("save") : t("addTone")}
          </Button>
        </footer>
      </section>

      {isPending ? (
        <Loader />
      ) : presets.length <= 0 ? (
        <p className="text-neutral-600 dark:text-gray-400">{t("noPresetsAdmin")}</p>
      ) : (
        <ul className="grid gap-3 grid-cols-1 lg:grid-cols-2">
          {presets.map((preset) => (
            <li key={preset.id} className="card p-4 flex flex-col gap-2">
              <div>
                <h4 className="font-semibold">{preset.name}</h4>
                <p className="text-sm text-neutral-600 dark:text-gray-400">
                  {typeLabels[preset.type]}
                  {preset.department ? ` · ${preset.department.value.value}` : ""}
                  {" · "}
                  {isBuiltInSound(preset.sound)
                    ? t(`builtin_${preset.sound.replace("builtin:", "")}`)
                    : t("customSound")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="xs" onPress={() => playToneSound(preset.sound)}>
                  {t("preview")}
                </Button>
                <Button size="xs" onPress={() => handleEdit(preset)}>
                  {common("edit")}
                </Button>
                <Button size="xs" variant="danger" onPress={() => handleDelete(preset)}>
                  {common("delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </TabsContent>
  );
}
