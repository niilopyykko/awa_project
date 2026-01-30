import Toolbar from "./Toolbar";
import DocumentCard from "./DocumentCard";
import type { IDocument, DocumentSortKey } from "../types";

interface DocumentListProps {
    documents: IDocument[];
    currentUsername: string;
    currentPage: number;
    totalPages: number;
    sortKey: DocumentSortKey;
    sortOrder: "asc" | "desc";
    query: string;
    toggleGrid: () => void;
    isMobile?: boolean;
    trashCount?: number;
    driveCount?: number;
    trash: boolean
}

export default function DocumentList({
    documents,
    currentUsername,
    currentPage,
    totalPages,
    sortKey,
    sortOrder,
    query,
    toggleGrid,
    isMobile,
    trashCount = 0,
    driveCount,
    trash
}: DocumentListProps) {
    return (
        <>
            <Toolbar
                page={currentPage}
                totalPages={totalPages}
                sortKey={sortKey}
                sortOrder={sortOrder}
                query={query}
                gridView={false}
                toggleGrid={toggleGrid}
                trash={trash}
                trashCount={trashCount}
                driveCount={driveCount}
                isMobile={isMobile}
            />

            <div className="flex flex-col gap-2 mt-2">
                {documents.map((doc) => (
                    <DocumentCard
                        key={doc._id}
                        doc={doc}
                        currentUser={currentUsername}
                        createdAt={doc.createdAt.toLocaleString()}
                        updatedAt={doc.updatedAt.toLocaleString()}
                        compact={true}
                    />
                ))}
            </div>
        </>
    );
}
