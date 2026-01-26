"use client";
import Image from "next/image";
import FileActions from "./FileActions";
import { IDocument } from "../../src/types";
import { useRouter } from "next/navigation";
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || ''
const ORIGIN = API.replace(/\/api$/, '')

type StatusInfo = { label: string; colorClass: string };
function computeStatus({ isPublic, hasShareLink, hasEditorsAssigned }: { isPublic?: boolean; hasShareLink?: boolean; hasEditorsAssigned?: boolean; }): StatusInfo {
    if (isPublic) return { label: 'Public', colorClass: 'bg-red-500 text-text' };
    if (hasShareLink) return { label: 'Link only', colorClass: 'bg-text-green text-text' };
    if (hasEditorsAssigned) return { label: 'Shared', colorClass: 'bg-text-purple text-text' };
    return { label: 'Private', colorClass: 'bg-text-muted text-text' };
}

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
    const status = computeStatus({ isPublic: doc.isVisibleNonAuth, hasShareLink: Boolean(doc.shareToken), hasEditorsAssigned: Boolean(doc.editors && doc.editors.length > 0) });

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
            className={`flex flex-col gap-3 p-3 rounded-lg border-2 bg-bg-toolbar border-border text-text`}
        >
            {/* Header + actions */}
            <div className="flex flex-col sm:flex-row items-start gap-2">
                <div className="flex-1 min-w-0 rounded-md shadow-md bg-background border border-border p-3">
                    <h3 className="font-bold truncate text-sm md:text-lg text-text">{doc.name}</h3>

                    <div className={`mt-1 text-sm text-text-muted ${compact ? "flex gap-2" : "flex flex-col gap-1"}`}>
                        <span className="hidden md:block truncate">
                            Uploaded by <b>{doc.owner?.username ?? "Unknown"}</b>
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
                                className="px-3 py-1.5 text-sm rounded-md bg-blue-500 hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
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
                            hasFile={Boolean(doc.filepath)}
                            isPublic={Boolean(doc.isVisibleNonAuth)}
                            hasShareLink={Boolean(doc.shareToken)}
                            hasEditorsAssigned={Boolean(doc.editors && doc.editors.length > 0)}
                            onUpdated={onUpdated}
                        />
                    </div>

                    <div className="hidden md:flex flex-col items-end gap-1 text-md">
                        <span className={`px-2 rounded-sm font-semibold ${status.colorClass}`}>
                            {status.label}
                        </span>
                        {doc.trash && (
                            <span className="px-3 py-1 rounded font-medium bg-red-600 dark:bg-red-700 text-white">
                                Trashed
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Media / preview */}
            {fileUrl && !compact && (
                isVideo ? (
                    <div className="h-48 overflow-hidden rounded flex justify-center bg-black dark:bg-gray-950">
                        <video src={fileUrl} controls className="h-full w-full object-contain" />
                    </div>
                ) : isGif || isImage ? (
                    <div className="h-48 overflow-hidden rounded flex items-center justify-center bg-gray-900 dark:bg-gray-950">
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
                    <a href={fileUrl} target="_blank" rel="noreferrer" className="underline text-text-blue">
                        Download
                    </a>
                )
            )}

            {!fileUrl && doc.content && !compact && (
                <div className={`relative h-40 rounded-2xl bg-bg-toolbar border border-border p-3 overflow-hidden ${isTrashed ? "opacity-60" : ""}`}>
                    <p className="text-sm md:text-base text-text">
                        {renderPlainText(doc.content)}
                    </p>
                </div>
            )}
        </div>
    );
}