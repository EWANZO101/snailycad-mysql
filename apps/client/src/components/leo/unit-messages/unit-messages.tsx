import * as React from "react";
import { useListener } from "@casperiv/use-socket.io";
import { SocketEvents } from "@snailycad/config";
import type { CombinedEmsFdUnit, CombinedLeoUnit, EmsFdDeputy, Officer } from "@snailycad/types";
import { Button, FullDate, Loader, SelectField, TextField } from "@snailycad/ui";
import { isUnitCombined, isUnitCombinedEmsFd, isUnitOfficer } from "@snailycad/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { Modal } from "components/modal/Modal";
import { useAuth } from "context/AuthContext";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { useGenerateCallsign } from "hooks/useGenerateCallsign";
import { classNames } from "lib/classNames";
import { toastMessage } from "lib/toastMessage";
import useFetch from "lib/useFetch";
import { makeUnitName } from "lib/utils";
import { useModal } from "state/modalState";
import { ModalIds } from "types/modal-ids";

type Unit = Officer | EmsFdDeputy;
type ActiveUnit = Officer | EmsFdDeputy | CombinedLeoUnit | CombinedEmsFdUnit;

interface UnitMessage {
  id: string;
  createdAt: string | Date;
  message: string;
  senderUnitId: string;
  recipientUnitId: string;
  readAt: string | Date | null;
}

interface ConversationsData {
  totalUnread: number;
  conversations: { unit: Unit; lastMessage: UnitMessage; unreadCount: number }[];
}

interface ThreadData {
  unit: Unit;
  messages: UnitMessage[];
}

/** combined units message from the signed-in user's own officer or deputy in that unit */
export function useOwnMessagingUnitId(activeUnit: ActiveUnit | null | undefined) {
  const { user } = useAuth();
  if (!activeUnit || !user) return null;

  if (isUnitCombined(activeUnit)) {
    return activeUnit.officers.find((officer) => officer.userId === user.id)?.id ?? null;
  }
  if (isUnitCombinedEmsFd(activeUnit)) {
    return activeUnit.deputies.find((deputy) => deputy.userId === user.id)?.id ?? null;
  }
  return activeUnit.id;
}

function useUnitLabel() {
  const { generateCallsign } = useGenerateCallsign();
  return (unit: Unit) =>
    `${generateCallsign(unit, isUnitOfficer(unit) ? "callsignTemplate" : "pairedUnitTemplate")} ${makeUnitName(unit)}`;
}

export function UnitMessagesButton({ activeUnit }: { activeUnit: ActiveUnit }) {
  const { UNIT_PRIVATE_MESSAGES } = useFeatureEnabled();
  const unitId = useOwnMessagingUnitId(activeUnit);
  const modalState = useModal();
  const { execute } = useFetch();
  const t = useTranslations("UnitMessages");

  const { data, refetch } = useQuery({
    enabled: Boolean(UNIT_PRIVATE_MESSAGES && unitId),
    queryKey: ["unit-messages", unitId],
    queryFn: async () => {
      const { json } = await execute<ConversationsData>({
        path: `/unit-messages/${unitId}`,
        noToast: true,
      });
      return Array.isArray(json.conversations) ? json : { totalUnread: 0, conversations: [] };
    },
  });

  useListener(
    SocketEvents.UnitPrivateMessage,
    (event: { senderUnitId: string; recipientUnitId: string }) => {
      if (!unitId || event.recipientUnitId !== unitId) return;
      refetch();

      if (modalState.isOpen(ModalIds.UnitMessages)) return;
      toastMessage({
        icon: "info",
        title: t("newMessageTitle"),
        message: (
          <Button
            size="sm"
            className="mt-2"
            onPress={() =>
              modalState.openModal(ModalIds.UnitMessages, {
                unitId,
                otherUnitId: event.senderUnitId,
              })
            }
          >
            {t("open")}
          </Button>
        ),
      });
    },
    [unitId],
  );

  if (!UNIT_PRIVATE_MESSAGES || !unitId) return null;

  const unread = data?.totalUnread ?? 0;

  return (
    <>
      <p className="flex items-center gap-x-1">
        <span className="font-semibold">{t("title")}: </span>
        <Button
          size="sm"
          className="h-8 flex items-center gap-2"
          onPress={() => modalState.openModal(ModalIds.UnitMessages, { unitId })}
        >
          {t("open")}
          {unread > 0 ? (
            <span className="rounded-full bg-red-500 text-white text-xs px-1.5 min-w-5 text-center">
              {unread}
            </span>
          ) : null}
        </Button>
      </p>
      <UnitMessagesModal />
    </>
  );
}

function UnitMessagesModal() {
  const modalState = useModal();
  const payload = modalState.getPayload<{ unitId: string; otherUnitId?: string }>(
    ModalIds.UnitMessages,
  );
  const isOpen = modalState.isOpen(ModalIds.UnitMessages);
  const unitId = payload?.unitId ?? null;
  const t = useTranslations("UnitMessages");
  const { execute } = useFetch();
  const unitLabel = useUnitLabel();
  const [selectedUnitId, setSelectedUnitId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) setSelectedUnitId(payload?.otherUnitId ?? null);
  }, [isOpen, payload?.otherUnitId]);

  const conversations = useQuery({
    enabled: isOpen && Boolean(unitId),
    queryKey: ["unit-messages", unitId],
    queryFn: async () => {
      const { json } = await execute<ConversationsData>({ path: `/unit-messages/${unitId}` });
      return Array.isArray(json.conversations) ? json : { totalUnread: 0, conversations: [] };
    },
  });

  const recipients = useQuery({
    enabled: isOpen && Boolean(unitId),
    queryKey: ["unit-messages-recipients", unitId],
    queryFn: async () => {
      const { json } = await execute<Unit[]>({ path: `/unit-messages/${unitId}/recipients` });
      return Array.isArray(json) ? json : [];
    },
  });

  if (!unitId) return null;

  const conversationUnitIds = new Set(
    conversations.data?.conversations.map((conversation) => conversation.unit.id),
  );
  const newRecipients = (recipients.data ?? []).filter((unit) => !conversationUnitIds.has(unit.id));

  return (
    <Modal
      title={t("title")}
      isOpen={isOpen}
      onClose={() => modalState.closeModal(ModalIds.UnitMessages)}
      className="w-[850px]"
    >
      <p className="-mt-1 mb-4 text-sm text-neutral-600 dark:text-gray-400">{t("privacyNote")}</p>

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <aside className="flex flex-col gap-3">
          <SelectField
            label={t("newMessage")}
            placeholder={newRecipients.length > 0 ? t("selectUnit") : t("noUnitsOnDuty")}
            isDisabled={newRecipients.length <= 0}
            selectedKey={null}
            onSelectionChange={(value) => value && setSelectedUnitId(String(value))}
            options={newRecipients.map((unit) => ({ value: unit.id, label: unitLabel(unit) }))}
          />

          <ul className="flex flex-col gap-1 max-h-[360px] overflow-y-auto thin-scrollbar">
            {conversations.isPending ? (
              <Loader />
            ) : conversations.data?.conversations.length ? (
              conversations.data.conversations.map((conversation) => (
                <li key={conversation.unit.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedUnitId(conversation.unit.id)}
                    className={classNames(
                      "w-full text-left rounded-md px-3 py-2 transition-colors",
                      selectedUnitId === conversation.unit.id
                        ? "bg-gray-200 dark:bg-secondary"
                        : "hover:bg-gray-100 dark:hover:bg-secondary/60",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">{unitLabel(conversation.unit)}</span>
                      {conversation.unreadCount > 0 ? (
                        <span className="rounded-full bg-red-500 text-white text-xs px-1.5">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-sm text-neutral-600 dark:text-gray-400 truncate">
                      {conversation.lastMessage.message}
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <p className="text-sm text-neutral-600 dark:text-gray-400">{t("noConversations")}</p>
            )}
          </ul>
        </aside>

        {selectedUnitId ? (
          <Thread unitId={unitId} otherUnitId={selectedUnitId} />
        ) : (
          <div className="grid place-content-center min-h-[200px] text-neutral-600 dark:text-gray-400">
            {t("selectConversation")}
          </div>
        )}
      </div>
    </Modal>
  );
}

function Thread({ unitId, otherUnitId }: { unitId: string; otherUnitId: string }) {
  const t = useTranslations("UnitMessages");
  const { execute, state } = useFetch();
  const queryClient = useQueryClient();
  const unitLabel = useUnitLabel();
  const [message, setMessage] = React.useState("");
  const endRef = React.useRef<HTMLLIElement | null>(null);

  const { data, isPending, refetch } = useQuery({
    queryKey: ["unit-messages-thread", unitId, otherUnitId],
    queryFn: async () => {
      const { json } = await execute<ThreadData>({
        path: `/unit-messages/${unitId}/${otherUnitId}`,
      });
      // opening the thread marks its messages read
      queryClient.invalidateQueries({ queryKey: ["unit-messages", unitId] });
      return Array.isArray(json.messages) ? json : null;
    },
  });

  useListener(
    SocketEvents.UnitPrivateMessage,
    (event: { senderUnitId: string; recipientUnitId: string }) => {
      if (event.senderUnitId === otherUnitId && event.recipientUnitId === unitId) refetch();
    },
    [unitId, otherUnitId],
  );

  React.useEffect(() => {
    endRef.current?.scrollIntoView();
  }, [data?.messages.length]);

  async function handleSend() {
    const trimmed = message.trim();
    if (!trimmed) return;

    const { json } = await execute<UnitMessage>({
      path: `/unit-messages/${unitId}/${otherUnitId}`,
      method: "POST",
      data: { message: trimmed },
    });

    if (json.id) {
      setMessage("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["unit-messages", unitId] });
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      handleSend();
    }
  }

  return (
    <section className="flex flex-col min-w-0">
      <h3 className="font-semibold mb-2">{data?.unit ? unitLabel(data.unit) : null}</h3>

      <ul className="flex flex-col gap-2 h-[300px] overflow-y-auto thin-scrollbar pr-1">
        {isPending ? (
          <Loader />
        ) : data?.messages.length ? (
          data.messages.map((item) => {
            const isMine = item.senderUnitId === unitId;
            return (
              <li
                key={item.id}
                className={classNames(
                  "max-w-[80%] rounded-lg px-3 py-2",
                  isMine
                    ? "self-end bg-blue-500/15 text-blue-950 dark:text-blue-100"
                    : "self-start bg-gray-200 dark:bg-secondary",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{item.message}</p>
                <span className="block mt-1 text-xs text-neutral-600 dark:text-gray-400">
                  <FullDate>{item.createdAt}</FullDate>
                </span>
              </li>
            );
          })
        ) : (
          <p className="text-neutral-600 dark:text-gray-400">{t("noMessages")}</p>
        )}
        <li ref={endRef} aria-hidden />
      </ul>

      <TextField
        className="mt-3"
        label={t("message")}
        value={message}
        onChange={setMessage}
        onKeyDown={handleKeyDown}
        isTextarea
        maxLength={2000}
      />
      <Button
        className="mt-2 self-end flex items-center gap-2"
        onPress={handleSend}
        isDisabled={state === "loading" || !message.trim()}
      >
        {state === "loading" ? <Loader /> : null}
        {t("send")}
      </Button>
    </section>
  );
}
