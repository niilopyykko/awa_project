import Toolbar from "./Toolbar";
import DocumentCard from "./DocumentCard";
import type { IDocument, DocumentSortKey } from "../types";

interface DocumentGridProps {
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

export default function DocumentGrid({
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
}: DocumentGridProps) {
    return (
        <>
            <Toolbar
                page={currentPage}
                totalPages={totalPages}
                sortKey={sortKey}
                sortOrder={sortOrder}
                query={query}
                gridView={true}
                toggleGrid={toggleGrid}
                trash={trash}
                trashCount={trashCount}
                driveCount={driveCount}
                isMobile={isMobile}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mt-2">
                {documents.map((doc) => (
                    <DocumentCard
                        key={doc._id}
                        doc={doc}
                        currentUser={currentUsername}
                        createdAt={doc.createdAt.toLocaleString()}
                        updatedAt={doc.updatedAt.toLocaleString()}
                    />
                ))}
            </div>
        </>
    );
}
