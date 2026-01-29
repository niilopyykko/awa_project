"use server"

import type { IDocument, DocumentSortKey } from "./types";
import { cookies } from "next/headers";

const API = process.env.BACKEND_URL;

export async function fetchDocuments(token: string | null): Promise<IDocument[]> {
  token = (await cookies()).get("token")?.value?? null;
   // 1) No token → fetch only public documents
  if (!token) {
    try {
      const pubRes = await fetch(`${API}/api/publicDocuments`, {
      });

      if (pubRes.ok) {
        const pubData = await pubRes.json();
        return Array.isArray(pubData) ? pubData : [];
      }
    } catch (err) {
      console.error("Failed to fetch public documents:", err);
    }

    return [];
  }

  // 2) Has token → fetch all documents
  try {
    const res = await fetch(`${API}/api/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : data.documents ?? [];
    }

    console.error(`Failed to fetch documents: ${res.status} ${res.statusText}`);
  } catch (err) {
    console.error("Error fetching documents:", err);
  }

  // 3) If auth request fails → fallback to public documents
  try {
    const pubRes = await fetch(`${API}/api/publicDocuments`, {
    });

    if (pubRes.ok) {
      const pubData = await pubRes.json();
      return Array.isArray(pubData) ? pubData : [];
    }
  } catch {}

  return [];
}

export async function filterDocuments(
  documents: IDocument[],
  query: string,
  trash?: boolean
): Promise<IDocument[]> {

  // 1) Suodata roskakorin mukaan vain jos trash-parametri on annettu
  const filteredByTrash =
    trash === undefined
      ? documents
      : documents.filter(doc => doc.trash === trash);

  // 2) Jos ei hakusanaa → palauta lista
  if (!query.trim()) return filteredByTrash;

  // 3) Suodata hakusanan mukaan
  const q = query.toLowerCase();
  return filteredByTrash.filter(doc =>
    doc.name.toLowerCase().includes(q)
  );
}



export async function sortDocuments(
  documents: IDocument[],
  sortKey: DocumentSortKey,
  sortOrder: "asc" | "desc"
): Promise<IDocument[]> {
  return [...documents].sort((a, b) => {
    const A = a[sortKey];
    const B = b[sortKey];

    if (typeof A === "string" && typeof B === "string") {
      return sortOrder === "asc" ? A.localeCompare(B) : B.localeCompare(A);
    }
    return 0;
  });
}

export async function paginateDocuments(
  documents: IDocument[],
  page: number,
  pageSize: number
): Promise<{ pageDocs: IDocument[]; totalPages: number; }> {
  const totalPages = Math.max(1, Math.ceil(documents.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageDocs = documents.slice(start, start + pageSize);
  
  return { pageDocs, totalPages };
}