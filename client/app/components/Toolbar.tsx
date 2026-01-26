"use client";
import React from "react";
import { FaSortDown, FaSortUp } from "react-icons/fa6";
import { IoGrid, IoList, IoBackspace, IoChevronBack, IoChevronForward } from "react-icons/io5";


interface Props {
    sortKey: 'name' | 'created' | 'modified';
    setSortKey: (k: 'name' | 'created' | 'modified') => void;
    sortOrder: 'asc' | 'desc';
    setSortOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
    gridView: boolean;
    toggleGrid: () => void;
    showTrash: boolean;
    setShowTrash: React.Dispatch<React.SetStateAction<boolean>>;
    trashCount: number;
    driveCount?: number;
    onSearch?: (q: string) => void;
    page?: number;
    setPage?: React.Dispatch<React.SetStateAction<number>>;
    totalPages?: number;
}

export default function Toolbar({ sortKey, setSortKey, sortOrder, setSortOrder, gridView, toggleGrid, showTrash, setShowTrash, trashCount, onSearch, page, setPage, totalPages }: Props) {
    const [query, setQuery] = React.useState("");
    return (
        <div id="viewToggle" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 lg:p-6 text-xl sm:text-2xl bg-[color:var(--bg-toolbar)] rounded-lg">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">

                <div className="relative flex items-center">
                    <input
                        value={query}
                        onChange={(e) => {
                            const val = e.target.value;
                            setQuery(val);
                            onSearch?.(val);
                        }}
                        placeholder="Search documents..."
                        className="text-sm sm:text-base px-3 h-10 sm:h-9 rounded-2xl bg-[color:var(--bg-input)] text-[color:var(--text)] border border-[color:var(--border)] w-48 sm:w-64"
                    />
                    {query && (
                        <button
                            onClick={() => {
                                setQuery("");
                                onSearch?.("");
                            }}
                            aria-label="Clear search"
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-2xl text-[color:var(--text-muted)] px-2"
                        >
                            <IoBackspace />
                        </button>
                    )}
                </div>

                {/* Pagination controls (shown when provided) */}
                {typeof page === 'number' && typeof setPage === 'function' && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(Math.max(1, (page || 1) - 1))}
                            disabled={(page || 1) <= 1}
                            className="px-2 py-1 rounded bg-[color:var(--bg-input)] text-[color:var(--text)] disabled:opacity-50"
                        >
                            <IoChevronBack></IoChevronBack>
                        </button>
                        <span className="text-sm text-[color:var(--text)]">{page}/{totalPages ?? 1}</span>
                        <button
                            onClick={() => setPage(Math.min(totalPages ?? 1, (page || 1) + 1))}
                            disabled={(page || 1) >= (totalPages ?? 1)}
                            className="px-2 py-1 rounded bg-[color:var(--bg-input)] text-[color:var(--text)] disabled:opacity-50"
                        >
                            <IoChevronForward></IoChevronForward>

                        </button>
                    </div>
                )}

                <label className="text-sm sm:text-base text-[color:var(--text)]">Sort:</label>
                <select value={sortKey} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortKey(e.target.value as 'name' | 'created' | 'modified')} className="text-sm sm:text-base p-2 rounded-2xl bg-purple-500 dark:bg-purple-700 text-white">
                    <option value="name">Name</option>
                    <option value="created">Created</option>
                    <option value="modified">Modified</option>
                </select>
                <button onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')} className="px-2 text-[color:var(--text)]">{sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />}</button>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={toggleGrid} className="text-[color:var(--text)]">
                    {gridView ? (<IoList />) : (<IoGrid />)}
                </button>
            </div>
        </div>
    );
}
