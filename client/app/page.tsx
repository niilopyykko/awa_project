"use client"

import { useEffect, useState } from "react";
import Toolbar from "./components/Toolbar";
import DocumentList from "./components/DocumentList";
import DocumentGrid from "./components/DocumentGrid";
import useDocuments from "./hooks/useDocuments";
import { IDocument } from "@/src/types";


export default function Home() {


  const [visibleDocuments, setVisibleDocuments] = useState<IDocument[]>([]);
  const [page, setPage] = useState<number>(1);

  const { documents, user, refresh } = useDocuments();
  const [gridView, setGridView] = useState<boolean>(false);
  const [showTrash, setShowTrash] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortKey, setSortKey] = useState<'name' | 'created' | 'modified'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const trashCount = documents.filter(d => Boolean(d.trash)).length;


  // Auto-open Trash view if the current user owns trashed items and there are no non-trashed items
  const ownsTrashed = documents.some(d => d.trash && d.owner && ((d.owner as { username?: string }).username === user));
  const nonTrashedCount = documents.filter(d => !d.trash).length;
  const effectiveShowTrash = showTrash || (ownsTrashed && nonTrashedCount === 0);
  // restore grid/list preference on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('awa:gridView')
      if (stored !== null) setGridView(stored === 'true')
    } catch {
      // ignore (e.g., SSR or storage disabled)
    }
  }, []);

  // persist grid/list preference whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('awa:gridView', String(gridView))
    } catch {
      // ignore
    }
  }, [gridView]);

  useEffect(() => {
    // filter by trash view first
    const shown = documents.filter(d => effectiveShowTrash ? Boolean(d.trash) : !Boolean(d.trash));

    // search
    const q = searchQuery.trim().toLowerCase();
    const searched = q
      ? shown.filter((d) => {
        const name = (d.name || "").toLowerCase();
        const owner = ((d.owner as { username?: string })?.username || "").toLowerCase();
        const filename = (d.filepath || "").split("/").pop()?.split("\\").pop()?.toLowerCase() || "";
        const content = (d.content || "").replace(/<[^>]*>/g, "").toLowerCase();
        const createdStr = new Date(d.createdAt).toLocaleString().toLowerCase();
        const createdIso = new Date(d.createdAt).toISOString().toLowerCase();
        const updatedStr = new Date(d.updatedAt).toLocaleString().toLowerCase();
        const updatedIso = new Date(d.updatedAt).toISOString().toLowerCase();
        return (
          name.includes(q) || owner.includes(q) || filename.includes(q) || content.includes(q)
          || createdStr.includes(q) || createdIso.includes(q) || updatedStr.includes(q) || updatedIso.includes(q)
        );
      })
      : shown;

    // sort
    const sorted = [...searched].sort((a, b) => {
      let valA: string | number = 0;
      let valB: string | number = 0;

      switch (sortKey) {
        case 'name':
          return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        case 'created':
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
          return sortOrder === 'asc' ? (valA - valB) : (valB - valA);
        case 'modified':
        default:
          valA = new Date(a.updatedAt).getTime();
          valB = new Date(b.updatedAt).getTime();
          return sortOrder === 'asc' ? (valA - valB) : (valB - valA);
      }
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleDocuments(sorted);
  }, [documents, searchQuery, showTrash, sortKey, sortOrder, user, effectiveShowTrash]);


  // reset page when query or filters change
  // compute pagination helpers
  const pageSize = gridView ? 6 : 8;
  const totalPages = Math.max(1, Math.ceil(visibleDocuments.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const paginatedDocs = visibleDocuments.slice((currentPage - 1) * pageSize, currentPage * pageSize);


  const handleUpdated = (opts?: { switchToDrive?: boolean }) => {
    // refresh documents list
    refresh();
    // if child requests switching back to Drive, close Trash view
    if (opts?.switchToDrive) setShowTrash(false);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className={`px-3 py-1 ml-8 min-w-sm text-center rounded-full text-md ${effectiveShowTrash ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {effectiveShowTrash ? 'Trash' : 'Drive'}
        </span>

        <Toolbar
          sortKey={sortKey}
          setSortKey={setSortKey}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          gridView={gridView}
          toggleGrid={() => setGridView(g => !g)}
          showTrash={effectiveShowTrash}
          setShowTrash={setShowTrash}
          trashCount={trashCount}
          driveCount={nonTrashedCount}
          onSearch={setSearchQuery}
          page={currentPage}
          setPage={setPage}
          totalPages={totalPages}
        />
      </div>

      {visibleDocuments.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh] p-8">
          <div>
            <p className="text-center p-4 text-2xl rounded-t-2xl bg-fuchsia-400 text-black">Drive is empty</p>
            <p className="text-center p-4 text-md rounded-b-2xl bg-fuchsia-200 text-black">OR DATABASE IS OFFLINE?</p>
          </div>
        </div>
      ) : (
        !gridView ? (
          <DocumentList
            documents={paginatedDocs}
            currentUser={user}
            onUpdated={handleUpdated}
          />
        ) : (
          <DocumentGrid
            documents={paginatedDocs}
            currentUser={user}
            onUpdated={handleUpdated}
          />
        )
      )}
    </>
  );
}