"use client";
import Image from "next/image";
import FileActions from "./FileActions";
import { IDocument } from "../../src/types";
import { useRouter } from "next/navigation";
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || ''
const ORIGIN = API.replace(/\/api$/, '')

interface Props {
    doc: IDocument;
    currentUser?: string | null;
    onUpdated?: (opts?: { switchToDrive?: boolean }) => void;
    compact?: boolean;
}

export default function DocumentCard({ doc, currentUser, onUpdated, compact }: Props) {
    const { user } = useAuth();
    const router = useRouter();
    const [fileUrl, setFileUrl] = useState<string | null>(null);

    // Get extension from filepath if available, otherwise from name
    const filename = doc.filepath || doc.name;
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const isImage = ["png", "jpg", "jpeg", "webp", "avif"].includes(ext);
    const isGif = ext === "gif";
    const isVideo = ["mp4", "webm", "ogg"].includes(ext);
    const isTrashed = Boolean(doc.trash);

    useEffect(() => {
        const fetchFile = async () => {
            const fileKey = doc._id || doc.shareToken;
            if (!fileKey) return;
            try {
                const res = await fetch(`/api/proxy/uploads/${fileKey}`, {
                    method: 'GET',
                    credentials: 'include',
                });

                if (!res.ok) {
                    console.error("Failed to fetch file", res.status);
                    setFileUrl(null);
                    return;
                }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                setFileUrl(url);
            } catch (err) {
                console.error("Error fetching file", err);
                setFileUrl(null);
            }
        };
        fetchFile();
    }, [doc._id, doc.shareToken]);

    const renderPlainText = (html: string) => {
        const div = document.createElement("div");
        div.innerHTML = html;
        return div.textContent || "";
    };

    const openEditor = () => {
        try {
            sessionStorage.setItem("editorContent", doc.content || "");
            sessionStorage.setItem("editorName", doc.name);
            sessionStorage.setItem("editorId", doc._id);
            sessionStorage.setItem(
                "editorEditors",
                (doc.editors?.map(e => e.username) ?? []).join(", ")
            );
            sessionStorage.setItem(
                "editorIsPublic",
                String(doc.isVisibleNonAuth)
            );
            router.push("/editor");
        } catch (err) {
            console.error("Could not open editor", err);
        }
    };

    return (
        <div
            className={`flex flex-col gap-3 p-2 rounded border-2
        ${compact ? "bg-amber-700 border-amber-400" : "bg-amber-800 border-amber-200"}`}
        >
            {/* Header + actions */}
            <div className="flex flex-col sm:flex-row items-start gap-2">
                <div className="flex-1 min-w-0 rounded-md shadow-2xl bg-amber-700 p-2">
                    <h3 className="font-bold truncate text-sm md:text-lg">{doc.name}</h3>

                    <div className={`mt-1 text-xs ${compact ? "flex gap-2" : "flex flex-col gap-1"}`}>
                        <span className="hidden md:block truncate">
                            Uploaded by <b>{doc.owner.username}</b>
                        </span>
                        <span className="hidden lg:block truncate">
                            Created @ {new Date(doc.createdAt).toLocaleString()}
                        </span>
                        <span className="hidden md:block truncate">
                            Last modified @ {new Date(doc.updatedAt).toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col sm:items-end items-start gap-1 shrink-0 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                        {!isTrashed && !isImage && !isVideo && user && (
                            <button
                                onClick={openEditor}
                                className="px-2 py-1 text-xs rounded-md bg-blue-500 hover:bg-blue-600"
                            >
                                Edit
                            </button>
                        )}
                        <FileActions
                            fileId={doc._id}
                            fileName={doc.name}
                            isTrashed={Boolean(doc.trash)}
                            fileOwner={doc.owner?.username ?? ""}
                            editors={doc.editors?.map(e => e.username) ?? []}
                            currentUsername={currentUser ?? undefined}
                            onUpdated={onUpdated}
                        />
                    </div>

                    <div className="hidden md:flex flex-col items-end gap-1 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-blue-200 text-black">
                            {doc.isVisibleNonAuth ? "Public" : "Private*"}
                        </span>
                        {doc.trash && (
                            <span className="px-2 py-0.5 rounded bg-red-600 text-white">
                                Trashed
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Media / preview */}
            {fileUrl && !compact && (
                isVideo ? (
                    <div className="h-48 overflow-hidden rounded flex justify-center bg-black">
                        <video src={fileUrl} controls className="h-full w-full object-contain" />
                    </div>
                ) : isGif || isImage ? (
                    <div className="h-48 overflow-hidden rounded flex items-center justify-center bg-gray-900">
                        <Image
                            src={fileUrl}
                            alt={doc.name}
                            width={400}
                            height={200}
                            unoptimized
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <a href={fileUrl} target="_blank" rel="noreferrer" className="underline">
                        Download
                    </a>
                )
            )}

            {!fileUrl && doc.content && !compact && (
                <div className={`relative h-40 rounded-2xl bg-amber-900 p-2 overflow-hidden ${isTrashed ? "opacity-60" : ""}`}>
                    <p className="text-xs md:text-sm">
                        {renderPlainText(doc.content)}
                    </p>
                </div>
            )}
        </div>
    );
}