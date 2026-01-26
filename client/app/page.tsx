"use client"

import { useEffect, useState } from "react";
import Toolbar from "./components/Toolbar";
import DocumentList from "./components/DocumentList";
import DocumentGrid from "./components/DocumentGrid";
import useDocuments from "./hooks/useDocuments";
import { IDocument } from "@/src/types";
import { IoFolder, IoTrash  } from "react-icons/io5";



export default function Home() {


  const [visibleDocuments, setVisibleDocuments] = useState<IDocument[]>([]);
  const [page, setPage] = useState<number>(1);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);

  const { documents, user, refresh } = useDocuments();
  const [gridView, setGridView] = useState<boolean>(false);
  const [showTrash, setShowTrash] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortKey, setSortKey] = useState<'name' | 'created' | 'modified'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const trashCount = documents.filter(d => Boolean(d.trash)).length;

  // Track window width for responsive page sizing
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-open Trash view if the current user owns trashed items and there are no non-trashed items
  const ownsTrashed = documents.some(d => d.trash && d.owner && ((d.owner as { username?: string }).username === user));
  const nonTrashedCount = documents.filter(d => !d.trash).length;
  const effectiveShowTrash = showTrash || (ownsTrashed && nonTrashedCount === 0);
  // restore grid/list preference on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('awa:gridView')
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
  // compute pagination helpers - responsive page size based on screen width
  const getPageSize = () => {
    if (!gridView) return 6; // list view always 6
    // grid view: adjust based on screen width
    if (windowWidth >= 1280) return 8; // xl: 4 cols × 2 rows
    if (windowWidth >= 1024) return 6; // lg: 3 cols × 2 rows
    if (windowWidth >= 640) return 4;  // sm: 2 cols × 2 rows
    return 2; // mobile: 1 col × 2 rows
  };
  const pageSize = getPageSize();
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3">
        <button
          onClick={() => setShowTrash(s => !s)}
          disabled={!effectiveShowTrash && trashCount === 0}
          className={`px-4 py-2 sm:px-6 sm:py-2.5 sm:ml-8 text-center rounded-full text-sm sm:text-base font-bold shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${effectiveShowTrash
              ? 'bg-gradient-to-r from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 text-white hover:from-red-700 hover:to-red-800 dark:hover:from-red-800 dark:hover:to-red-900'
              : 'bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 text-white hover:from-green-600 hover:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800'
            }`}
        >
          {effectiveShowTrash ? (
            <span className="flex items-center justify-center gap-2">
              <IoTrash /> Trash ({trashCount})
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <IoFolder /> Drive ({nonTrashedCount})
            </span>
          )}
        </button>

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
        <div className="flex items-center justify-center min-h-[40vh] p-6 sm:p-8">
          <div className="w-full max-w-md">
            <p className="text-center p-4 text-xl sm:text-2xl rounded-t-2xl bg-purple-500 dark:bg-purple-700 text-white">Drive is empty</p>
            <p className="text-center p-4 text-sm sm:text-md rounded-b-2xl bg-purple-200 dark:bg-purple-900 text-gray-800 dark:text-gray-200">OR DATABASE IS OFFLINE?</p>
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