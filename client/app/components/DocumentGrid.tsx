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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
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

