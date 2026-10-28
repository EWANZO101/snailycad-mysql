import type { GetMyDotWorkersData } from "@snailycad/types/api";
import { useQuery } from "@tanstack/react-query";
import useFetch from "lib/useFetch";

export function useGetUserDotWorkers(options?: { enabled?: boolean }) {
  const { execute } = useFetch();

  const { data, isLoading } = useQuery({
    refetchOnWindowFocus: false,
    ...(options ?? {}),
    queryKey: ["/dot"],
    queryFn: async () => {
      const { json } = await execute<GetMyDotWorkersData>({ path: "/dot" });

      if (Array.isArray(json.workers)) {
        return json.workers;
      }

      return [];
    },
  });

  return { userWorkers: data ?? [], isLoading };
}
