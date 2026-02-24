"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DocumentGrid from "./DocumentGrid";
import DocumentList from "./DocumentList";
import type { IDocument, DocumentSortKey } from "../types";

interface Props {
  documents: IDocument[];
  currentUsername: string;
  currentPage: number;
  totalPages: number;
  sortKey: DocumentSortKey;
  sortOrder: "asc" | "desc";
  query: string;
  initialView: "grid" | "list";
  allDocuments: IDocument[];
  trash: boolean;
  isPublic?: boolean;
  hasShareLink?: boolean;
  sharedWith?: string;
}

export function AutoPollDocuments() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, 5000); // 5 sec

    return () => clearInterval(id);
  }, [router]);

  return null;
}


export default function HomeViewClient({
  documents: initialDocuments,
  currentUsername,
  currentPage,
  sortKey,
  sortOrder,
  query,
  initialView,
  allDocuments,
  trash,
  isPublic,
  hasShareLink,
  sharedWith,
}: Props) {
  const router = useRouter();
  const [hydrated] = useState(() => true); //nice trick

  const [windowWidth, setWindowWidth] = useState(0);
  useEffect(() => {
    const update = () => setWindowWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const getPageSize = () => {
    if (initialView === "list") return 6;
    if (windowWidth >= 1280) return 8;
    if (windowWidth >= 1024) return 6;
    if (windowWidth >= 640) return 4;
    if (windowWidth >= 480) return 1;
    return 5;
  };
  const pageSize = getPageSize();
  // 1) Filter documents by trash status
  let filteredDocs = allDocuments.filter(doc => doc.trash === trash);
  if (isPublic !== undefined) filteredDocs = filteredDocs.filter(doc => doc.isVisibleNonAuth === isPublic);
  if (hasShareLink !== undefined) filteredDocs = filteredDocs.filter(doc => hasShareLink ? !!doc.shareToken : !doc.shareToken);
  if (sharedWith) filteredDocs = filteredDocs.filter(doc => doc.editors.some(e => e.username === sharedWith));

  // 2) Calculate total pages based on filtered documents
  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  // 3) Paginate filtered documents
  const paginatedDocs = filteredDocs.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  // 4) Final list to render
  const docsToRender = hydrated ? paginatedDocs : initialDocuments;



  const toggleView = (newView: "grid" | "list") => {
    const params = new URLSearchParams({
      page: "1",
      sort: sortKey,
      order: sortOrder,
      query,
      view: newView
    });
    router.push(`?${params.toString()}`);
  };

  const isMobile = windowWidth < 768;
  const isGridView = isMobile ? true : initialView === "grid";

  const trashCount = allDocuments.filter((d) => d.trash).length;
  const driveCount = allDocuments.filter((d) => !d.trash).length;
  return (
    <div className="w-full px-2 sm:px-3 lg:px-4 py-2">
      <AutoPollDocuments />

      {isGridView ? (
        <DocumentGrid
          documents={docsToRender}
          currentUsername={currentUsername}
          currentPage={safePage}
          totalPages={totalPages}
          toggleGrid={() => toggleView("list")}
          sortKey={sortKey}
          sortOrder={sortOrder}
          query={query}
          isMobile={isMobile}
          trashCount={trashCount}
          driveCount={driveCount}
          trash={trash}
        />
      ) : (
        <DocumentList
          documents={docsToRender}
          currentUsername={currentUsername}
          currentPage={safePage}
          totalPages={totalPages}
          toggleGrid={() => toggleView("grid")}
          sortKey={sortKey}
          sortOrder={sortOrder}
          query={query}
          isMobile={isMobile}
          trashCount={trashCount}
          driveCount={driveCount}
          trash={trash}
        />
      )}
    </div>
  );
}
