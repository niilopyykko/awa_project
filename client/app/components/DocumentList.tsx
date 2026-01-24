"use client";
import DocumentCard from "./DocumentCard";
import { IDocument } from "../../src/types";

interface Props {
    documents: IDocument[];
    currentUser?: string | null;
    onUpdated?: (opts?: { switchToDrive?: boolean }) => void;
}

export default function DocumentList({ documents, currentUser, onUpdated }: Props) {
    return (
        <div className="p-4">
            <div className="flex flex-col gap-4">
                {documents.map(doc => (
                    <DocumentCard
                        key={doc._id}
                        doc={doc}
                        currentUser={currentUser}
                        onUpdated={onUpdated}
                        compact={true}
                    />
                ))}
            </div>
        </div>
    );
}
