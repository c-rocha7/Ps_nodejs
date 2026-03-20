import { getConstants } from "@/constants";

export const moveFileService = async (
  fileId: number,
  folder: string | null
) => {
  const { url } = getConstants();
  const token = localStorage.getItem(getConstants().LOCAL_STORAGE_TOKEN);

  const response = await fetch(`${url}/file/${fileId}/folder`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ folder }),
  });

  const data = await response.json();

  if (!response.ok) throw new Error(data.message);

  return data.file;
};
