"use client";
import { IUser } from "@/src/types";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || ''
const ORIGIN = API.replace(/\/api$/, '')
interface FileActionsProps {
    fileId: string;
    fileName: string;
    isTrashed?: boolean;
    fileOwner?: string
    currentUsername?: string
    editors?: string[]
    hasFile?: boolean
    onUpdated?: (opts?: { switchToDrive?: boolean }) => void
}

export default function FileActions({ fileId, fileName, isTrashed = false, fileOwner, currentUsername, editors = [], hasFile = false, onUpdated }: FileActionsProps) {
    const router = useRouter();
    const { token } = useAuth();
    // Strict props-based visibility: require currentUsername prop and owner match
    if (!currentUsername) return null;
    const isOwner = fileOwner && String(currentUsername) === String(fileOwner);
    const isEditor = Array.isArray(editors) && editors.map(String).includes(String(currentUsername));
    if (!isOwner && !isEditor) return null;

    const api = async (path: string, method = 'POST', callOnUpdated = true) => {
        try {
            const res = await fetch(path, {
                method,
                credentials: 'include'
            });
            if (!res.ok) throw new Error(`Request failed: ${res.status}`);
            if (callOnUpdated && onUpdated) onUpdated();
            try { router.refresh(); } catch { }
        } catch (err) {
            console.error(err);
            alert('Action failed. See console for details.');
        }
    };
    const handleTogglePublic = async () => {
        try {
            const res = await fetch(`/api/proxy/documents/${fileId}`, { method: 'GET', credentials: 'include' });
            if (!res.ok) throw new Error(`Fetch doc failed: ${res.status}`);
            const data = await res.json();
            const doc = data?.document || data || {};
            const current = !!doc.isVisibleNonAuth;
            const confirmMsg = current ? `Make "${fileName}" private?` : `Make "${fileName}" public to everyone?`;
            if (!confirm(confirmMsg)) return;

            const setRes = await fetch(`/api/proxy/documents/${fileId}/visibility`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ makePublic: !current })
            });
            if (!setRes.ok) {
                let msg = `Set visibility failed: ${setRes.status}`;
                try { const j = await setRes.json(); if (j && j.message) msg += ` - ${j.message}` } catch { }
                alert(msg);
                return;
            }
            alert(`Visibility updated`);
            if (onUpdated) onUpdated();
            try { router.refresh(); } catch { }
        } catch (err) {
            console.error(err);
            alert('Could not update visibility. See console for details.');
        }
    };
    // here we use web browser confirmation so no files are accidentally deleted
    const handleTrash = async () => {
        if (isOwner) {
            const confirmed = confirm(`Move "${fileName}" to trash?`);
            if (!confirmed) return;

            try {
                await api(`/api/proxy/documents/${fileId}/trash`, 'POST', true);
                alert(`"${fileName}" moved to trash`);
                if (onUpdated) onUpdated();
            } catch (err) {
                console.error(err);
                alert('Could not move document to trash. See console for details.');
            }
            return;
        }

        if (isEditor) {
            const confirmed = confirm(`Remove yourself as a collaborator from "${fileName}"?`);
            if (!confirmed) return;

            try {
                const res = await fetch(`/api/proxy/documents/${fileId}/share`, {
                    method: 'POST',
                    credentials: 'include', // tärkeää, jotta HttpOnly-cookie lähetetään
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ remove: true }) // ei usernamea
                });

                const data = await res.json().catch(() => null);
                if (!res.ok) {
                    const msg = data?.message ? `Remove collaborator failed: ${data.message}` : `Remove collaborator failed: ${res.status}`;
                    alert(msg);
                    return;
                }

                alert('You have been removed as a collaborator');
                if (onUpdated) onUpdated();
            } catch (err) {
                console.error(err);
                alert('Could not remove collaborator. See console for details.');
            }
            return;
        }

        alert('You do not have permission to move this file to trash.');
    };

    const handleRestore = () => {
        if (!confirm(`Restore "${fileName}" from trash?`)) return;
        api(`/api/proxy/documents/${fileId}/restore`, 'POST', true);
        // Ask parent to switch back to Drive view after restoring
        if (onUpdated) onUpdated({ switchToDrive: true });
    };

    const handleDeletePermanent = () => {
        if (!confirm(`Permanently delete "${fileName}"? This cannot be undone.`)) return;
        api(`/api/proxy/documents/${fileId}`, 'DELETE', true);
        // Request parent switch back to Drive; if trash becomes empty, UI will reflect it
        if (onUpdated) onUpdated({ switchToDrive: true });
    };
    const handleDownload = async () => {
        try {
            // If the document has an uploaded file, download that; otherwise export text to PDF.
            const route = hasFile ? `/api/proxy/uploads/${fileId}` : `/api/proxy/documents/${fileId}/pdf`;
            const res = await fetch(route, {
                method: 'GET',
                credentials: 'include'
            });

            if (!res.ok) {
                let msg = `Download failed: ${res.status}`;
                try {
                    const ct = res.headers.get('content-type') || ''
                    if (ct.includes('application/json')) {
                        const j = await res.json(); if (j && j.message) msg += ` - ${j.message}`;
                    } else {
                        const txt = await res.text(); if (txt) msg += ` - ${txt}`;
                    }
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
    const handleCopy = async () => {
        try {
            // fetch original document
            const res = await fetch(`/api/proxy/documents/${fileId}`, {
                method: 'GET',
                credentials: 'include'
            });
            if (!res.ok) throw new Error(`Fetch doc failed: ${res.status}`);
            const data = await res.json();
            const doc = data?.document || data;
            if (!doc) {
                alert('Original document not found');
                return;
            }

            const newName = `Copy of ${doc.name || fileName}`;
            const formData = new FormData();
            formData.append('name', newName);
            formData.append('content', doc.content || '');
            formData.append('isPublic', String(!!doc.isVisibleNonAuth));
            formData.append('editors', (doc.editors || []).map((e: IUser) => (e.username ? e.username : String(e))).join(','));

            // If original has an uploaded file, fetch it and append as 'file' so backend receives multipart file
            try {
                const fileRes = await fetch(`/api/proxy/uploads/${fileId}`, { credentials: 'include' });
                if (fileRes.ok) {
                    const blob = await fileRes.blob();
                    // Preserve original filename (with extension) if we have filepath; otherwise fall back to doc.name
                    const originalName = (doc.filepath ? doc.filepath.split(/[/\\]/).pop() : null) || doc.name || fileName || 'file';
                    formData.append('file', blob, originalName);
                }
            } catch (e) {
                // ignore file fetch errors and proceed with text copy
            }

            const createRes = await fetch(`/api/proxy/upload`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
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
    };

    const handleRename = () => {
        const newName = prompt('New file name', fileName);
        if (!newName) return;
        (async () => {
            try {
                const res = await fetch(`/api/proxy/documents/${fileId}/rename`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
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
            const res = await fetch(`/api/proxy/documents/${fileId}/share`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
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
            const res = await fetch(`/api/proxy/documents/${fileId}`, {
                method: 'GET',
                credentials: 'include'
            });
            if (!res.ok) throw new Error(`Fetch doc failed: ${res.status}`);
            const data = await res.json();
            let link = data?.readOnlyLink || data?.document?.readOnlyLink || '';
            if (!link) {
                // fallback: look for a JSON property named readOnlyLink
                const flat = JSON.stringify(data || {});
                const m = flat.match(/"readOnlyLink"\s*:\s*"([^"]+)"/i);
                if (m && m[1]) link = m[1];
            }
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
                        <DropdownItem key="download" className="cursor-pointer m-1 px-1 text-center size-auto bg-blue-300 rounded-md text-black" onClick={handleDownload}>Download</DropdownItem>
                        <DropdownItem key="share" className="cursor-pointer m-1 px-1 text-center size-auto bg-blue-300 rounded-md text-black" onClick={handleShare} >Share</DropdownItem>
                        <DropdownItem key="visibility" className="cursor-pointer m-1 px-1 text-center size-auto bg-blue-300 rounded-md text-black" onClick={handleTogglePublic}>Make Public/Private</DropdownItem>
                        <DropdownItem key="link" className="cursor-pointer m-1 px-1 text-center size-auto bg-blue-300 rounded-md text-black" onClick={handleLink}>Get Share Link</DropdownItem>
                        <DropdownItem key="trash" className="cursor-pointer m-1 px-1 text-center size-auto bg-yellow-300 rounded-md text-black" onClick={handleTrash}>Move to Trash</DropdownItem>

                    </>
                ) : (
                    <>
                        <DropdownItem key="restore" className="cursor-pointer m-1 px-1 text-center size-auto bg-green-300 rounded-md text-black" onClick={handleRestore}>Restore</DropdownItem>
                        <DropdownItem key="delete" className="text-danger cursor-pointer m-1 px-1 text-center size-auto bg-red-300 rounded-md text-black" color="danger" onClick={handleDeletePermanent}>Delete Permanently</DropdownItem>
                    </>
                )}
            </DropdownMenu>
        </Dropdown >
    );
}