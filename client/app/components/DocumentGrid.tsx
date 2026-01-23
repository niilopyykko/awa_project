"use client";
import DocumentCard from "./DocumentCard";
import { IDocument } from "../../src/types";

interface Props {
    documents: IDocument[];
    jwt?: string | null;
    currentUser?: string | null;
    onUpdated?: (opts?: { switchToDrive?: boolean }) => void;
}

export default function DocumentGrid({ documents, jwt, currentUser, onUpdated }: Props) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {documents.map(doc => (
                <div key={doc._id} className="bg-amber-800 border-amber-200 border-4 flex rounded-sm flex-col p-4 hover:bg-violet-600 focus:outline-2 focus:outline-offset-2 focus:outline-violet-500 active:bg-violet-700 relative cursor-pointer">
                    <DocumentCard doc={doc} jwt={jwt} currentUser={currentUser} onUpdated={onUpdated} />
                </div>
            ))}
        </div>
    );
}
