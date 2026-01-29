import Image from "next/image";
import FileActions from "./FileActions";
import { IDocument } from "../types";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

type StatusInfo = { label: string; colorClass: string };

function computeStatus({
    isPublic,
    hasShareLink,
    hasEditorsAssigned,
}: {
    isPublic?: boolean;
    hasShareLink?: boolean;
    hasEditorsAssigned?: boolean;
}): StatusInfo {
    if (isPublic) return { label: "Public", colorClass: "bg-red-500 text-text" };
    if (hasShareLink) return { label: "Link", colorClass: "bg-green-600 text-text" };
    if (hasEditorsAssigned) return { label: "Shared", colorClass: "bg-purple-500 text-text" };
    return { label: "Private", colorClass: "bg-gray-500 text-text" };
}

interface Props {
    doc: IDocument;
    currentUser?: string | null;
    createdAt: string;
    updatedAt: string;
    compact?: boolean;
}



export default function DocumentCard({ doc, currentUser, createdAt, updatedAt, compact }: Props) {

    const filename = doc.filepath || doc.name;
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const isPublic = !!doc.isVisibleNonAuth

    const isImage = ["png", "jpg", "jpeg", "webp", "avif"].includes(ext);
    const isGif = ext === "gif";
    const isVideo = ["mp4", "webm", "ogg"].includes(ext);
    const isTrashed = Boolean(doc.trash);

    const status = computeStatus({
        isPublic: doc.isVisibleNonAuth,
        hasShareLink: Boolean(doc.shareToken),
        hasEditorsAssigned: Boolean(doc.editors?.length),
    });

    // Direct backend URL for preview images and videos
    const fileUrl =
        doc.filepath
            ? isPublic
                ? `${BACKEND}/api/publicUploads/${doc._id}`
                : `${BACKEND}/api/uploads/${doc._id}`
            : null;

    function renderPlainText(html: string) {
        return html.replace(/<[^>]+>/g, "");
    }
    return (
        <div className="card flex flex-col gap-2 p-2 rounded-lg border-2 bg-bg-toolbar border-border text-text" suppressHydrationWarning>
            {/* Header + actions */}
            <div className="flex flex-col sm:flex-row items-start gap-1.5">
                <div className="flex-1 min-w-0 rounded-md shadow-md bg-background border border-border p-2">
                    <h3 className="font-bold truncate text-xs sm:text-sm md:text-lg text-text">{doc.name}</h3>

                    <div
                        className={`mt-0.5 text-sm text-text-muted ${compact ? "flex gap-2" : "flex flex-col gap-0.5"
                            }`}
                    >
                        <span className="hidden md:block truncate">
                            Uploaded by <b>{doc.owner?.username ?? "Unknown"}</b>
                        </span>
                        <span className="hidden lg:block truncate">
                            Created @ {createdAt}
                        </span>
                        <span className="hidden md:block truncate">
                            Last modified @ {updatedAt}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col sm:items-end items-start gap-0.5 shrink-0 w-full sm:w-auto">
                    <div className="flex items-center gap-1">


                        <FileActions
                            userDocument={doc}
                            currentUsername={currentUser ?? ""}
                        />
                    </div>

                    <div className="hidden md:flex flex-col items-end gap-0.5 text-md">
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
                <div
                    className={`relative h-40 rounded-2xl bg-background border border-border p-3 overflow-hidden ${isTrashed ? "opacity-60" : ""
                        }`}
                >
                    <p className="text-sm md:text-base text-text">
                        {renderPlainText(doc.content)}
                    </p>
                </div>
            )}
        </div>
    );
}
