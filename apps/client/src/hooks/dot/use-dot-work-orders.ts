import type { GetDotWorkOrdersData } from "@snailycad/types/api";
import { useQuery } from "@tanstack/react-query";
import useFetch from "lib/useFetch";

export function useDotWorkOrders(options?: {
  enabled?: boolean;
  initialData?: GetDotWorkOrdersData;
}) {
  const { execute } = useFetch();

  const { data, isLoading, refetch } = useQuery({
    refetchInterval: 20_000,
    refetchOnWindowFocus: false,
    ...(options ?? {}),
    queryKey: ["dot", "work-orders"],
    queryFn: async () => {
      const { json } = await execute<GetDotWorkOrdersData>({
        path: "/dot/work-orders",
        noToast: true,
      });

      return Array.isArray(json) ? json : [];
    },
  });

  return { workOrders: data ?? [], isLoading, refetchWorkOrders: refetch };
}
