"use client";
import DocumentCard from "./DocumentCard";
import { IDocument } from "../../src/types";

interface Props {
    documents: IDocument[];
    jwt?: string | null;
    currentUser?: string | null;
    onUpdated?: (opts?: { switchToDrive?: boolean }) => void;
}

export default function DocumentList({ documents, jwt, currentUser, onUpdated }: Props) {
    return (
        <div className="p-4">
            <div className="flex flex-col gap-2">
                {documents.map(doc => (
                    <DocumentCard key={doc._id} doc={doc} jwt={jwt} currentUser={currentUser} onUpdated={onUpdated} />
                ))}
            </div>
        </div>
    );
}
