"use client"

import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react";
import type { IDocument } from "../types";
import { useEffect, useState } from "react";

import {
    deleteDocument,
    trashDocument,
    restoreDocument,
    renameDocument,
    togglePublic,
    shareDocument,
    removeCollaboratorAction,
    revokeShareLink,
    copyDocument,
    generateShareLink,
} from "@/app/documents/actions";
import { useRouter } from "next/navigation";

interface FileActionsProps {
    userDocument: IDocument;
    currentUsername: string;
}

export default function FileActions({ userDocument, currentUsername }: FileActionsProps) {
    const router = useRouter();
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);
    const isOwner = userDocument.owner?.username === currentUsername;
    const isEditor = userDocument.editors?.some(e => e.username === currentUsername);
    const isTrashed = userDocument.trash;
    const isPublic = userDocument.isVisibleNonAuth;
    const hasEditorsAssigned = userDocument.editors && userDocument.editors.length > 0;
    const hasShareLink = !!userDocument.shareToken;
    const isFile = !!userDocument.filepath

    if (!isOwner && !isEditor) return null;

    // Don't render on server to prevent hydration mismatch with react-aria IDs
    if (!isHydrated) return null;

    const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

    const openEditor = () => {
        try {
            sessionStorage.setItem("editorContent", userDocument.content || "");
            sessionStorage.setItem("editorName", userDocument.name);
            sessionStorage.setItem("editorId", userDocument._id);
            sessionStorage.setItem(
                "editorEditors",
                (userDocument.editors?.map((e) => e.username) ?? []).join(", ")
            );
            sessionStorage.setItem("editorIsPublic", String(userDocument.isVisibleNonAuth));
            router.push(`/editor?id=${userDocument._id}`);
        } catch (err) {
            console.error("Could not open editor", err);
        }
    };

    return (
        <Dropdown>
            <DropdownTrigger>
                <Button variant="bordered" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md text-sm py-1 px-2">
                    Menu
                </Button>
            </DropdownTrigger>

            <DropdownMenu
                aria-label="File Actions"
                className="cursor-pointer bg-gray-900 dark:bg-gray-950 rounded-md text-white shadow-lg"
            >
                {!isTrashed ? (
                    <>
                        {/* EDIT */}
                        {!isFile ? (
                            < DropdownItem
                                key="edit"
                                className="cursor-pointer my-1 py-1 px-2 text-center bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                                onClick={openEditor}
                            >
                                Edit
                            </DropdownItem>
                        ) : (null)}


                        {/* RENAME */}
                        <DropdownItem
                            key="rename"
                            className="cursor-pointer my-1 px-2 py-1 text-center bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                            onClick={async () => {
                                const newName = prompt("New name:", userDocument.name);
                                if (newName) {
                                    await renameDocument(userDocument._id, newName);
                                    router.refresh();
                                }
                            }}
                        >
                            Rename
                        </DropdownItem>

                        {/* COPY */}
                        <DropdownItem
                            key="copy"
                            className="cursor-pointer my-1 px-2 py-1 text-center bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                            onClick={async () => {
                                await copyDocument(userDocument._id);
                                router.refresh();

                            }}
                        >
                            Create a Copy
                        </DropdownItem>

                        {/* DOWNLOAD */}
                        <DropdownItem
                            key="download"
                            className="cursor-pointer my-1 px-2 py-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
                            onClick={async () => {
                                try {
                                    const filename = userDocument.name || "download";
                                    const filepath = userDocument.filepath || "";
                                    const ext = filepath.split(".").pop()?.toLowerCase();
                                    const textExts = ["txt", "md", "json", "csv", "xml", "yml", "yaml", "log"];
                                    const usePdf = !userDocument.filepath || (ext ? textExts.includes(ext) : false);

                                    const url = usePdf
                                        ? `/api/proxy/documents/${userDocument._id}/pdf`
                                        : `/api/proxy/documents/${userDocument._id}?download=1`;

                                    const res = await fetch(url, { credentials: "include" });
                                    if (!res.ok) throw new Error("Download failed");
                                    const blob = await res.blob();

                                    const downloadName = usePdf && !filename.toLowerCase().endsWith(".pdf")
                                        ? `${filename}.pdf`
                                        : filename;

                                    const objectUrl = URL.createObjectURL(blob);
                                    const a = globalThis.document.createElement("a");
                                    a.href = objectUrl;
                                    a.download = downloadName;
                                    globalThis.document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                    URL.revokeObjectURL(objectUrl);
                                } catch (err) {
                                    console.error(err);
                                    alert("Download failed");
                                }
                            }}
                        >
                            Download
                        </DropdownItem>

                        {/* SHARE */}
                        <DropdownItem
                            key="share"
                            className="cursor-pointer my-1 px-2 py-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
                            onClick={async () => {
                                const username = prompt("Share with username:");
                                if (username) {
                                    await shareDocument(userDocument._id, username);
                                    router.refresh();
                                }
                            }}
                        >
                            Share
                        </DropdownItem>

                        {/* REMOVE COLLABORATOR */}
                        {hasEditorsAssigned && (

                            <DropdownItem
                                key="remove-collab"
                                className="cursor-pointer my-1 px-2 py-1 text-center bg-purple-600 hover:bg-purple-700 text-white rounded-md"
                                onClick={async () => {
                                    const username = prompt("Remove collaborator username:");
                                    if (!username) return;

                                    try {
                                        await removeCollaboratorAction(userDocument._id, username.trim(), currentUsername);
                                        router.refresh();
                                    } catch (err: unknown) {
                                        const message = err instanceof Error ? err.message : "An error occurred";
                                        alert(message);
                                    }
                                }}


                            >
                                Remove Collaborator
                            </DropdownItem>)
                        }


                        {/* TOGGLE PUBLIC */}
                        <DropdownItem
                            key="visibility"
                            className={`cursor-pointer my-1 px-2 py-1 text-center rounded-md text-white ${!isPublic
                                ? "bg-amber-600 hover:bg-amber-700"
                                : "bg-green-600 hover:bg-green-700"
                                }`}
                            onClick={async () => {
                                await togglePublic(userDocument._id);
                                router.refresh()
                                //refresh text also??
                            }}
                        >
                            {isPublic ? "Make Private" : "Make Public"}
                        </DropdownItem>

                        {/* GET SHARE LINK */}
                        <DropdownItem
                            key="link"
                            className="cursor-pointer my-1 px-2 py-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
                            onClick={async () => {
                                try {
                                    let token = userDocument.shareToken || null;
                                    if (!token) {
                                        const data = await generateShareLink(userDocument._id);
                                        token = data.shareToken || null;
                                    }
                                    if (!token) throw new Error("Share token missing");
                                    const link = `${window.location.origin}/share/${token}`;
                                    await navigator.clipboard.writeText(link);
                                    alert("Share link copied to clipboard");
                                } catch (err) {
                                    console.error(err);
                                    alert("Failed to generate share link");
                                }
                            }}
                        >
                            Get Share Link
                        </DropdownItem>

                        {/* REVOKE SHARE LINK */}
                        {hasShareLink && (
                            <DropdownItem
                                key="revoke-link"
                                className="cursor-pointer my-1 px-2 py-1 text-center bg-red-600 hover:bg-red-700 text-white rounded-md"
                                onClick={async () => {
                                    await revokeShareLink(userDocument._id);
                                }}
                            >
                                Revoke Share Link
                            </DropdownItem>
                        )}

                        {/* MOVE TO TRASH */}
                        <DropdownItem
                            key="trash"
                            className="cursor-pointer my-1 px-2 py-1 text-center bg-red-600 hover:bg-red-700 text-white rounded-md"
                            onClick={async () => {
                                await trashDocument(userDocument._id);
                                router.refresh();
                            }}
                        >
                            Move to Trash
                        </DropdownItem>
                    </>
                ) : (
                    <>
                        {/* RESTORE */}
                        <DropdownItem
                            key="restore"
                            className="cursor-pointer my-1 px-2 py-1 text-center bg-green-600 hover:bg-green-700 text-white rounded-md"
                            onClick={async () => {
                                await restoreDocument(userDocument._id);
                                router.refresh();
                            }}
                        >
                            Restore
                        </DropdownItem>

                        {/* DELETE PERMANENTLY */}
                        <DropdownItem
                            key="delete"
                            className="cursor-pointer my-1 px-2 py-1 text-center bg-red-600 hover:bg-red-700 text-white rounded-md"
                            onClick={async () => {
                                await deleteDocument(userDocument._id);
                                router.refresh();
                            }}
                        >
                            Delete Permanently
                        </DropdownItem>
                    </>
                )}
            </DropdownMenu>
        </Dropdown >
    );
}
