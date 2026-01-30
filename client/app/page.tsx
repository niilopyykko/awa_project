import HomeViewClient from "./components/HomeViewClient";
import { cookies } from "next/headers";
import type { DocumentSortKey } from "./types";
import { fetchDocuments, filterDocuments, sortDocuments } from "./actions";

const API = process.env.BACKEND_URL;

interface Props {
  searchParams: {
    page?: string;
    sort?: DocumentSortKey;
    order?: "asc" | "desc";
    query?: string;
    view?: "grid" | "list";
    trash?: string;
  };
}

export default async function HomePage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value ?? null;
  const params = await searchParams;

  // Extract URL parameters
  const sortKey = params.sort ?? "name";
  const sortOrder = params.order ?? "asc";
  const query = params.query ?? "";
  const page = Number(params.page ?? 1);
  const viewMode = params.view ?? "grid";
  const trash = params.trash === "true";

  // Fetch current user
  let currentUser = "";
  if (token) {
    try {
      const userRes = await fetch(`${API}/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
        next: { tags: ["user-profile"], revalidate: 15 },
      });

      if (userRes.ok) {
        const userData = await userRes.json();
        currentUser = userData.username;
      }
    } catch { }
  }




  // Fetch documents
  const allDocuments = await fetchDocuments(token);

  // Filter, sort, and paginate
  const filtered = await filterDocuments(allDocuments, query);
  const sorted = await sortDocuments(filtered, sortKey, sortOrder);

  // Pass raw date strings to client; format in client to avoid hydration issues
  const formatted = sorted;

  // Pass all sorted documents to client for responsive pagination
  return (
    <HomeViewClient
      documents={[]} // Not used anymore
      allDocuments={formatted}
      currentUsername={currentUser}
      currentPage={page}
      totalPages={1} // Calculated client-side
      sortKey={sortKey}
      sortOrder={sortOrder}
      query={query}
      initialView={viewMode}
      trash={trash}
    />
  );
}
