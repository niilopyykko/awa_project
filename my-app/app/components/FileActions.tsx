import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react";
import { useRouter } from "next/navigation";

interface FileActionsProps {
    fileId: string;
    fileName: string;
    isTrashed?: boolean;

}

export default function FileActions({ fileId, fileName, isTrashed = false }: FileActionsProps) {
    const router = useRouter();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const api = async (path: string, method = 'POST') => {
        try {
            const res = await fetch(path, {
                method,
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error(`Request failed: ${res.status}`);
            router.refresh();
        } catch (err) {
            console.error(err);
            alert('Action failed. See console for details.');
        }
    };
    // here we use web browser confirmation so no files are accidentally deleted
    const handleTrash = () => {
        if (!confirm(`Move "${fileName}" to trash?`)) return;
        api(`http://localhost:3001/api/documents/${fileId}/trash`, 'POST');
    };

    const handleRestore = () => {
        if (!confirm(`Restore "${fileName}" from trash?`)) return;
        api(`http://localhost:3001/api/documents/${fileId}/restore`, 'POST');
    };

    const handleDeletePermanent = () => {
        if (!confirm(`Permanently delete "${fileName}"? This cannot be undone.`)) return;
        api(`http://localhost:3001/api/documents/${fileId}`, 'DELETE');
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
                router.refresh();
            } catch (err) {
                console.error(err);
                alert('Rename failed.');
            }
        })();
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
                        <DropdownItem key="share" onClick={() => alert('Share not implemented')} className="cursor-pointer m-1 px-1 text-center size-auto bg-blue-300 rounded-md text-black">Share</DropdownItem>
                        <DropdownItem key="trash" className="cursor-pointer m-1 px-1 text-center size-auto bg-yellow-300 rounded-md text-black" onClick={handleTrash}>Move to Trash</DropdownItem>
                    </>
                ) : (
                    <>
                        <DropdownItem key="restore" className="cursor-pointer m-1 px-1 text-center size-auto bg-green-300 rounded-md text-black" onClick={handleRestore}>Restore</DropdownItem>
                        <DropdownItem key="delete" className="text-danger cursor-pointer m-1 px-1 text-center size-auto bg-red-300 rounded-md text-red-950" color="danger" onClick={handleDeletePermanent}>Delete Permanently</DropdownItem>
                    </>
                )}
            </DropdownMenu>
        </Dropdown>
    );
}