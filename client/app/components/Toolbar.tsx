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
        <div id="viewToggle" className="flex items-center justify-end gap-4 p-4 md:p-4 lg:p-8 text-2xl md:text-3xl">
            <div className="flex items-center gap-2">

                <div className="relative flex items-center">
                    <input
                        value={query}
                        onChange={(e) => {
                            const val = e.target.value;
                            setQuery(val);
                            onSearch?.(val);
                        }}
                        placeholder="Search documents..."
                        className="text-base px-3 h-8 md:h-9 rounded-2xl bg-white text-black"
                    />
                    {query && (
                        <button
                            onClick={() => {
                                setQuery("");
                                onSearch?.("");
                            }}
                            aria-label="Clear search"
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-2xl text-gray-600 px-2"
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
                            className="px-2 py-1 rounded bg-gray-200 text-black disabled:opacity-50"
                        >
                            <IoChevronBack></IoChevronBack>
                        </button>
                        <span className="text-sm">{page}/{totalPages ?? 1}</span>
                        <button
                            onClick={() => setPage(Math.min(totalPages ?? 1, (page || 1) + 1))}
                            disabled={(page || 1) >= (totalPages ?? 1)}
                            className="px-2 py-1 rounded bg-gray-200 text-black disabled:opacity-50"
                        >
                            <IoChevronForward></IoChevronForward>

                        </button>
                    </div>
                )}

                <label className="text-base">Sort:</label>
                <select value={sortKey} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortKey(e.target.value as 'name' | 'created' | 'modified')} className="text-base p-1 rounded-2xl bg-fuchsia-500 text-black">
                    <option value="name">Name</option>
                    <option value="created">Created</option>
                    <option value="modified">Modified</option>
                </select>
                <button onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')} className="px-2">{sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />}</button>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setShowTrash(s => !s)}
                    className={`px-3 py-1 rounded-2xl ${showTrash ? 'bg-green-600' : 'bg-red-600'} text-white`}
                    disabled={!showTrash && trashCount === 0}
                >
                    {showTrash ? `Back to Drive` : (trashCount > 0 ? `Open Trash (${trashCount})` : `Trash (empty)`)}
                </button>
                <button onClick={toggleGrid}>
                    {gridView ? (<IoList />) : (<IoGrid />)}
                </button>
            </div>
        </div>
    );
}
