"use client";
import React from "react";
import { FaSortDown, FaSortUp } from "react-icons/fa6";
import { IoGridOutline } from "react-icons/io5";

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
}

export default function Toolbar({ sortKey, setSortKey, sortOrder, setSortOrder, gridView, toggleGrid, showTrash, setShowTrash, trashCount }: Props) {
    return (
        <div id="viewToggle" className="flex items-center justify-end gap-4 p-4 md:p-4 lg:p-8 text-2xl md:text-3xl">
            <div className="flex items-center gap-2">
                <label className="text-base">Sort:</label>
                <select value={sortKey} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortKey(e.target.value as 'name' | 'created' | 'modified')} className="text-base p-1 rounded-2xl bg-fuchsia-500 text-black">
                    <option value="name">Name</option>
                    <option value="created">Created</option>
                    <option value="modified">Modified (WIP)</option>
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
                    {gridView ? (<div className="p-1"><svg viewBox="0 0 24 24" className="w-6 h-6"><path d="M4 6h16v12H4z" /></svg></div>) : (<IoGridOutline />)}
                </button>
            </div>
        </div>
    );
}
