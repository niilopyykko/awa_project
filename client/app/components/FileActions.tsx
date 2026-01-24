"use client";
import { IUser } from "@/src/types";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react";
import { useRouter } from "next/navigation";

interface FileActionsProps {
    fileId: string;
    fileName: string;
    isTrashed?: boolean;
    fileOwner?: string
    currentUsername?: string
    editors?: string[]
    onUpdated?: (opts?: { switchToDrive?: boolean }) => void
}

export default function FileActions({ fileId, fileName, isTrashed = false, fileOwner, currentUsername, editors = [], onUpdated }: FileActionsProps) {
    const router = useRouter();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    // Strict props-based visibility: require currentUsername prop and owner match
    if (!currentUsername) return null;
    const isOwner = fileOwner && String(currentUsername) === String(fileOwner);
    const isEditor = Array.isArray(editors) && editors.map(String).includes(String(currentUsername));
    if (!isOwner && !isEditor) return null;

    const api = async (path: string, method = 'POST', callOnUpdated = true) => {
        try {
            const res = await fetch(path, {
                method,
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error(`Request failed: ${res.status}`);
            if (callOnUpdated && onUpdated) onUpdated();
            try { router.refresh(); } catch { }
        } catch (err) {
            console.error(err);
            alert('Action failed. See console for details.');
        }
    };
    // here we use web browser confirmation so no files are accidentally deleted
    const handleTrash = () => {
        if (!confirm(`Move "${fileName}" to trash?`)) return;
        api(`http://localhost:3001/api/documents/${fileId}/trash`, 'POST', true);
    };

    const handleRestore = () => {
        if (!confirm(`Restore "${fileName}" from trash?`)) return;
        api(`http://localhost:3001/api/documents/${fileId}/restore`, 'POST', true);
        // Ask parent to switch back to Drive view after restoring
        if (onUpdated) onUpdated({ switchToDrive: true });
    };

    const handleDeletePermanent = () => {
        if (!confirm(`Permanently delete "${fileName}"? This cannot be undone.`)) return;
        api(`http://localhost:3001/api/documents/${fileId}`, 'DELETE', true);
        // Request parent switch back to Drive; if trash becomes empty, UI will reflect it
        if (onUpdated) onUpdated({ switchToDrive: true });
    };
    const handleDownload = async () => {
        try {
            const res = await fetch(`http://localhost:3001/api/documents/${fileId}/pdf`, {
                method: 'GET',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (!res.ok) {
                let msg = `Download failed: ${res.status}`;
                try {
                    const j = await res.json(); if (j && j.message) msg += ` - ${j.message}`;
                } catch { }
                throw new Error(msg);
            }

            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const j = await res.json();
                throw new Error(j?.message || 'Download returned JSON');
            }

            const blob = await res.blob();
            let filename = fileName || 'document.pdf';
            const cd = res.headers.get('content-disposition') || '';
            const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^";\n]+)/i);
            if (m && m[1]) filename = decodeURIComponent(m[1]);

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert((err as Error).message || 'Download failed. See console for details.');
        }
    };
    const handleCopy = () => {
        (async () => {
            try {
                // fetch original document
                const res = await fetch(`http://localhost:3001/api/documents/${fileId}`, {
                    method: 'GET',
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                if (!res.ok) throw new Error(`Fetch doc failed: ${res.status}`);
                const data = await res.json();
                const doc = data?.document || data;
                if (!doc) {
                    alert('Original document not found');
                    return;
                }

                const newName = `Copy of ${doc.name || fileName}`;
                const body = {
                    name: newName,
                    content: doc.content || "",
                    isPublic: !!doc.isVisibleNonAuth,
                    editors: (doc.editors || []).map((e: IUser) => (e.username ? e.username : String(e))).join(',')
                };

                const createRes = await fetch(`http://localhost:3001/api/upload`, {
                    method: 'POST',
                    headers: token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                if (!createRes.ok) {
                    let msg = `Create copy failed: ${createRes.status}`;
                    try {
                        const j = await createRes.json();
                        if (j && j.message) msg += ` - ${j.message}`;
                    } catch { }
                    alert(msg);
                    return;
                }

                alert(`Created copy: ${newName}`);
                if (onUpdated) onUpdated();
                try { router.refresh(); } catch { }
            } catch (err) {
                console.error(err);
                alert('Could not create copy. See console for details.');
            }
        })();
    };

    const handleRename = () => {
        const newName = prompt('New file name', fileName);
        if (!newName) return;
        (async () => {
            try {
                const res = await fetch(`http://localhost:3001/api/documents/${fileId}/rename`, {
                    method: 'POST',
                    headers: token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName })
                });
                if (!res.ok) throw new Error('Rename failed');
                // Notify parent to refresh its documents state (home is a client component)
                if (onUpdated) onUpdated();
                // also trigger app-level refresh
                try { router.refresh(); } catch { }
            } catch (err) {
                console.error(err);
                alert('Rename failed.');
            }
        })();
    };
    const handleShare = async () => {
        const collaborator = prompt('Share with username');
        if (!collaborator || collaborator?.length <= 1) return;

        try {
            const res = await fetch(`http://localhost:3001/api/documents/${fileId}/share`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collaborator })
            });
            console.log(res)
            if (!res.ok) {
                let errMsg = `Share failed: ${res.status}`;
                try {
                    const data = await res.json();
                    if (data && data.message) errMsg += ` - ${data.message}`;
                } catch {
                }
                if (errMsg) alert(errMsg);
                return;

            }
            alert(`Shared with ${collaborator}`);
            if (onUpdated) onUpdated();
            try { router.refresh(); } catch { }
        } catch (err) {
            console.error(err);
            alert((err as Error).message || 'Share failed. See console for details.');
        }
    };

    const handleLink = async () => {
        // Read-only links are created at upload time; fetch document and read readOnlyLink
        try {
            const res = await fetch(`http://localhost:3001/api/documents/${fileId}`, {
                method: 'GET',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error(`Fetch doc failed: ${res.status}`);
            const data = await res.json();
            const link = data?.readOnlyLink || data?.document?.readOnlyLink || '';
            if (link) {
                try {
                    await navigator.clipboard.writeText(link);
                    alert(`View-only link copied to clipboard:\n${link}`);
                } catch {
                    prompt('View-only link (copy manually):', link);
                }
            } else {
                alert('No read-only link available for this file.');
            }
        } catch (err) {
            console.error(err);
            alert('Could not fetch read-only link. See console for details.');
        }
    };

    return (
        <Dropdown>
            <DropdownTrigger>
                <Button variant="bordered" className="bg-blue-500 rounded-md text-lg">
                    Open Menu
                </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="File Actions" className="cursor-pointer bg-blue-200 rounded-md text-black">
                {!isTrashed ? (
                    <>
                        <DropdownItem key="rename" className="cursor-pointer m-1 px-1 text-center size-auto bg-blue-300 rounded-md text-black" onClick={handleRename}>Rename</DropdownItem>
                        <DropdownItem key="copy" className="cursor-pointer m-1 px-1 text-center size-auto bg-blue-300 rounded-md text-black" onClick={handleCopy}>Create Copy</DropdownItem>
                        <DropdownItem key="download" className="cursor-pointer m-1 px-1 text-center size-auto bg-blue-300 rounded-md text-black" onClick={handleDownload}>Download PDF</DropdownItem>
                        <DropdownItem key="share" className="cursor-pointer m-1 px-1 text-center size-auto bg-blue-300 rounded-md text-black" onClick={handleShare} >Share</DropdownItem>
                        <DropdownItem key="link" className="cursor-pointer m-1 px-1 text-center size-auto bg-blue-300 rounded-md text-black" onClick={handleLink}>Get Share Link</DropdownItem>
                        <DropdownItem key="trash" className="cursor-pointer m-1 px-1 text-center size-auto bg-yellow-300 rounded-md text-black" onClick={handleTrash}>Move to Trash</DropdownItem>

                    </>
                ) : (
                    <>
                        <DropdownItem key="restore" className="cursor-pointer m-1 px-1 text-center size-auto bg-green-300 rounded-md text-black" onClick={handleRestore}>Restore</DropdownItem>
                        <DropdownItem key="delete" className="text-danger cursor-pointer m-1 px-1 text-center size-auto bg-red-300 rounded-md text-red-950" color="danger" onClick={handleDeletePermanent}>Delete Permanently</DropdownItem>
                    </>
                )}
            </DropdownMenu>
        </Dropdown >
    );
}