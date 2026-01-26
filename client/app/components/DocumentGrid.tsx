"use client";
import DocumentCard from "./DocumentCard";
import { IDocument } from "../../src/types";

interface Props {
    documents: IDocument[];
    currentUser?: string | null;
    onUpdated?: (opts?: { switchToDrive?: boolean }) => void;
}
export default function DocumentGrid({ documents, currentUser, onUpdated }: Props) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 p-2 sm:p-4">
            {documents.map(doc => (
                <DocumentCard
                    key={doc._id}
                    doc={doc}
                    currentUser={currentUser}
                    onUpdated={onUpdated}
                    compact={false}
                />
            ))}
        </div>
    );
}

