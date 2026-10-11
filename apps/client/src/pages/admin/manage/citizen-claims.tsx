import * as React from "react";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import { useTranslations } from "use-intl";
import { Button, buttonVariants, FullDate, Status } from "@snailycad/ui";
import { WhitelistStatus } from "@snailycad/types";
import { Permissions } from "@snailycad/permissions";
import { getSessionUser } from "lib/auth";
import { getTranslations } from "lib/getTranslation";
import { requestAll } from "lib/utils";
import useFetch from "lib/useFetch";
import { AdminLayout } from "components/admin/AdminLayout";
import { Title } from "components/shared/Title";
import { Table, useTableState } from "components/shared/Table";
import { usePermission } from "hooks/usePermission";

interface CitizenClaimRequest {
  id: string;
  status: WhitelistStatus;
  reason: string | null;
  createdAt: Date | string;
  reviewedAt: Date | string | null;
  citizen: {
    id: string;
    name: string;
    surname: string;
    dateOfBirth: Date | string;
    socialSecurityNumber: string | null;
    userId: string | null;
  };
  user: { id: string; username: string };
  reviewedBy: { id: string; username: string } | null;
}

interface GetCitizenClaimsData {
  totalCount: number;
  claims: CitizenClaimRequest[];
}

interface Props {
  data: GetCitizenClaimsData;
}

const STATUSES = [WhitelistStatus.PENDING, WhitelistStatus.ACCEPTED, WhitelistStatus.DECLINED];

export default function ManageCitizenClaims({ data: initialData }: Props) {
  const [status, setStatus] = React.useState<WhitelistStatus>(WhitelistStatus.PENDING);
  const [data, setData] = React.useState(initialData);
  const [reviewingId, setReviewingId] = React.useState<string | null>(null);

  const t = useTranslations("CitizenClaims");
  const tCitizen = useTranslations("Citizen");
  const common = useTranslations("Common");
  const tableState = useTableState();
  const { execute, state } = useFetch();
  const { hasPermissions } = usePermission();
  const hasViewUsersPermissions = hasPermissions([Permissions.ViewUsers]);
  const hasManageCitizensPermissions = hasPermissions([Permissions.ManageCitizens]);

  async function fetchClaims(newStatus: WhitelistStatus) {
    const { json } = await execute<GetCitizenClaimsData>({
      path: "/admin/manage/citizen-claims",
      params: { status: newStatus, includeAll: true },
    });

    if (Array.isArray(json.claims)) {
      setData(json);
    }
  }

  function handleStatusChange(newStatus: WhitelistStatus) {
    setStatus(newStatus);
    fetchClaims(newStatus);
  }

  async function handleReview(claim: CitizenClaimRequest, type: WhitelistStatus) {
    setReviewingId(claim.id);
    const { json } = await execute<CitizenClaimRequest>({
      path: `/admin/manage/citizen-claims/${claim.id}`,
      method: "PUT",
      data: { type },
    });
    setReviewingId(null);

    if (json.id) {
      // accepting a claim also declines other pending claims for the same citizen
      await fetchClaims(status);
    }
  }

  return (
    <AdminLayout
      permissions={{
        permissions: [Permissions.ManageCitizenClaims, Permissions.ManageCitizens],
      }}
    >
      <Title>{t("citizenClaims")}</Title>
      <p className="my-2 text-neutral-700 dark:text-gray-400">{t("citizenClaimsInfo")}</p>

      <div className="flex gap-2 my-3">
        {STATUSES.map((s) => (
          <Button
            key={s}
            size="xs"
            variant={status === s ? "default" : "cancel"}
            onPress={() => handleStatusChange(s)}
            isDisabled={state === "loading"}
          >
            {t(s)}
          </Button>
        ))}
      </div>

      {data.claims.length <= 0 ? (
        <p className="mt-5">{t("noClaimRequests")}</p>
      ) : (
        <Table
          tableState={tableState}
          data={data.claims.map((claim) => ({
            id: claim.id,
            citizen: hasManageCitizensPermissions ? (
              <Link href={`/admin/manage/citizens/${claim.citizen.id}`} className="underline">
                {claim.citizen.name} {claim.citizen.surname}
              </Link>
            ) : (
              `${claim.citizen.name} ${claim.citizen.surname}`
            ),
            dateOfBirth: (
              <FullDate isDateOfBirth onlyDate>
                {claim.citizen.dateOfBirth}
              </FullDate>
            ),
            socialSecurityNumber: claim.citizen.socialSecurityNumber ?? common("none"),
            user: hasViewUsersPermissions ? (
              <Link
                href={`/admin/manage/users/${claim.user.id}`}
                className={buttonVariants({ size: "xs" })}
              >
                {claim.user.username}
              </Link>
            ) : (
              claim.user.username
            ),
            reason: claim.reason || common("none"),
            status: <Status>{claim.status}</Status>,
            createdAt: <FullDate>{claim.createdAt}</FullDate>,
            reviewedBy: claim.reviewedBy?.username ?? common("none"),
            reviewedAt: claim.reviewedAt ? <FullDate>{claim.reviewedAt}</FullDate> : common("none"),
            actions:
              claim.status === WhitelistStatus.PENDING ? (
                <>
                  <Button
                    size="xs"
                    variant="success"
                    isDisabled={reviewingId === claim.id || Boolean(claim.citizen.userId)}
                    onPress={() => handleReview(claim, WhitelistStatus.ACCEPTED)}
                  >
                    {t("accept")}
                  </Button>
                  <Button
                    className="ml-2"
                    size="xs"
                    variant="danger"
                    isDisabled={reviewingId === claim.id}
                    onPress={() => handleReview(claim, WhitelistStatus.DECLINED)}
                  >
                    {t("decline")}
                  </Button>
                </>
              ) : null,
          }))}
          columns={[
            { header: t("citizen"), accessorKey: "citizen" },
            { header: tCitizen("dateOfBirth"), accessorKey: "dateOfBirth" },
            { header: tCitizen("socialSecurityNumber"), accessorKey: "socialSecurityNumber" },
            { header: t("user"), accessorKey: "user" },
            { header: t("reason"), accessorKey: "reason" },
            { header: t("status"), accessorKey: "status" },
            { header: t("requestedAt"), accessorKey: "createdAt" },
            status !== WhitelistStatus.PENDING
              ? { header: t("reviewedBy"), accessorKey: "reviewedBy" }
              : null,
            status !== WhitelistStatus.PENDING
              ? { header: t("reviewedAt"), accessorKey: "reviewedAt" }
              : null,
            status === WhitelistStatus.PENDING
              ? { header: common("actions"), accessorKey: "actions" }
              : null,
          ]}
        />
      )}
    </AdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ locale, req }) => {
  const user = await getSessionUser(req);
  const [data] = await requestAll(req, [
    ["/admin/manage/citizen-claims?status=PENDING&includeAll=true", { claims: [], totalCount: 0 }],
  ]);

  return {
    props: {
      data,
      session: user,
      messages: {
        ...(await getTranslations(["citizen", "admin", "common"], user?.locale ?? locale)),
      },
    },
  };
};
