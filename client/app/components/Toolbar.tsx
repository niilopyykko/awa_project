"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaSortDown, FaSortUp } from "react-icons/fa6";
import {
    IoGrid,
    IoList,
    IoBackspace,
    IoChevronBack,
    IoChevronForward,
    IoTrash,
    IoFolder,
} from "react-icons/io5";
import type { DocumentSortKey } from "../types";

interface ToolbarProps {
    page: number;
    totalPages: number;
    sortKey: DocumentSortKey;
    sortOrder: "asc" | "desc";
    query: string;
    gridView: boolean;
    toggleGrid: () => void;

    // Trash-related properties
    trash: boolean;
    trashCount: number;
    driveCount?: number;
    isMobile?: boolean;
}

export default function Toolbar({
    page,
    totalPages,
    sortKey,
    sortOrder,
    query,
    gridView,
    toggleGrid,
    trash,
    trashCount,
    driveCount,
    isMobile,
}: ToolbarProps) {
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsClient(true);
    }, []);

    // Update URL parameters
    const update = (params: Record<string, string | number | boolean>) => {
        const nextTrash =
            params.trash !== undefined ? params.trash : trash;

        const search = new URLSearchParams({
            page: String(params.page ?? page),
            sort: String(params.sort ?? sortKey),
            order: String(params.order ?? sortOrder),
            query: String(params.query ?? query),
            trash: String(nextTrash),
            view: gridView ? "grid" : "list",
        });

        router.push(`?${search.toString()}`);
    };


    return (
        <div className="flex flex-col gap-2 p-1.5 sm:p-2 lg:p-3 bg-bg-toolbar rounded-lg">
            {/* Toolbar controls */}
            <div
                id="viewToggle"
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xl sm:text-2xl"
            >
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex items-center">
                        <input
                            value={query}
                            onChange={(e) => update({ query: e.target.value, page: 1 })}
                            placeholder="Search documents..."
                            className="text-sm sm:text-base px-3 h-10 sm:h-9 rounded-2xl bg-bg-input text-text border border-border w-48 sm:w-64 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                        />
                        {query && (
                            <button
                                onClick={() => update({ query: "", page: 1 })}
                                aria-label="Clear search"
                                className="absolute right-1 top-1/2 -translate-y-1/2 text-2xl text-text-muted px-2"
                            >
                                <IoBackspace />
                            </button>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => update({ page: page - 1 })}
                            disabled={page <= 1}
                            className="px-2 py-1 rounded bg-bg-input text-text dark:bg-gray-800 dark:text-white disabled:opacity-50"
                        >
                            <IoChevronBack className="text-lg sm:text-xl" />
                        </button>

                        <span className="text-sm text-text" suppressHydrationWarning>
                            {page}/{totalPages}
                        </span>

                        <button
                            onClick={() => update({ page: page + 1 })}
                            disabled={page >= totalPages}
                            className="px-2 py-1 rounded bg-bg-input text-text dark:bg-gray-800 dark:text-white disabled:opacity-50"
                        >
                            <IoChevronForward className="text-lg sm:text-xl" />
                        </button>
                    </div>

                    {/* Sort */}
                    <label className="text-sm sm:text-base text-text">Sort:</label>
                    <select
                        value={sortKey}
                        onChange={(e) => update({ sort: e.target.value, page: 1 })}
                        className="text-sm sm:text-base p-2 rounded-2xl bg-purple-500 dark:bg-purple-700 text-white"
                    >
                        <option value="name">Name</option>
                        <option value="createdAt">Created</option>
                        <option value="updatedAt">Modified</option>
                    </select>

                    <button
                        onClick={() =>
                            update({ order: sortOrder === "asc" ? "desc" : "asc" })
                        }
                        className="px-2 text-text"
                    >
                        {sortOrder === "asc" ? <FaSortUp className="text-lg sm:text-xl" /> : <FaSortDown className="text-lg sm:text-xl" />}
                    </button>

                    {/* Drive toggle */}
                    <button
                        onClick={() => update({ trash: false, page: 1 })}
                        className={`flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-bold text-base min-w-45 ${!trash ? "bg-green-600 text-white shadow-lg" : "bg-bg-input text-text dark:bg-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                    >
                        <IoFolder className="text-xl sm:text-2xl lg:text-3xl" />
                        <span>Drive ({driveCount})</span>
                    </button>

                    {/* Trash toggle */}
                    <button
                        onClick={() => update({ trash: true, page: 1 })}
                        className={`flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-bold text-base min-w-45 ${trash ? "bg-red-600 text-white shadow-lg" : "bg-bg-input text-text dark:bg-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                    >
                        <IoTrash className="text-xl sm:text-2xl lg:text-3xl" />
                        <span>Trash ({trashCount})</span>
                    </button>

                </div>

                {/* Grid/List toggle - hidden on mobile */}
                {isClient && !isMobile ? (
                    <div className="flex items-center gap-2">
                        <button onClick={toggleGrid} className="text-text text-4xl sm:text-5xl pr-4">
                            {gridView ? <IoList className="text-3xl sm:text-4xl lg:text-5xl" /> : <IoGrid className="text-3xl sm:text-4xl lg:text-5xl" />}
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    )
}
