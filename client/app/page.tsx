"use client"

import { useState } from "react";
import Toolbar from "./components/Toolbar";
import DocumentList from "./components/DocumentList";
import DocumentGrid from "./components/DocumentGrid";
import useDocuments from "./hooks/useDocuments";

export default function Home() {

  const { documents, token, user, refresh } = useDocuments();
  const [gridView, setGridView] = useState<boolean>(false);
  const [showTrash, setShowTrash] = useState<boolean>(false);
  const [sortKey, setSortKey] = useState<'name' | 'created' | 'modified'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortedDocuments = [...documents].sort((a, b) => {
    let valA: string | number = 0;
    let valB: string | number = 0;

    switch (sortKey) {
      case 'name':
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      case 'created':
      default:
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
        return sortOrder === 'asc' ? (valA - valB) : (valB - valA);
    }
  });

  const trashCount = documents.filter(d => Boolean(d.trash)).length;

  // Auto-open Trash view if the current user owns trashed items and there are no non-trashed items
  const ownsTrashed = documents.some(d => d.trash && d.owner && ((d.owner as { username?: string }).username === user));
  const nonTrashedCount = documents.filter(d => !d.trash).length;
  const effectiveShowTrash = showTrash || (ownsTrashed && nonTrashedCount === 0);
  const visibleDocuments = sortedDocuments.filter(d => effectiveShowTrash ? Boolean(d.trash) : !Boolean(d.trash));

  const handleUpdated = (opts?: { switchToDrive?: boolean }) => {
    // refresh documents list
    refresh();
    // if child requests switching back to Drive, close Trash view
    if (opts?.switchToDrive) setShowTrash(false);
  };

  return (
    <>
      {!(visibleDocuments.length === 0 && !effectiveShowTrash) && (
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
        />
      )}

      <div className="p-4">
        <div className="mb-4">
          <span className={`px-3 py-1 rounded-full text-sm ${effectiveShowTrash ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
            {effectiveShowTrash ? 'Trash' : 'Drive'}
          </span>
        </div>

        {visibleDocuments.length === 0 ? (
          <div className="flex items-center justify-center min-h-[40vh] p-8">
            <div>
              <p className="text-center p-4 text-2xl rounded-t-2xl bg-fuchsia-400 text-black">Drive is empty</p>
              <p className="text-center p-4 text-md rounded-b-2xl bg-fuchsia-200 text-black">OR DATABASE IS OFLINE?</p>
            </div>
          </div>
        ) : (
          !gridView ? (
            <DocumentList documents={visibleDocuments} jwt={token} currentUser={user} onUpdated={handleUpdated} />
          ) : (
            <DocumentGrid documents={visibleDocuments} jwt={token} currentUser={user} onUpdated={handleUpdated} />
          )
        )}
      </div>
    </>
  );
}