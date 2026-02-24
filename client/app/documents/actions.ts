"use server";

import { cookies } from "next/headers";

const API = process.env.BACKEND_URL;

// Check if user is authenticated
async function requireAuth() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
        throw new Error("Unauthorized: No authentication token");
    }
    return token;
}

// Helper to get auth headers for server-to-server requests
async function getAuthHeaders() {
    const token = await requireAuth();
    return { Authorization: `Bearer ${token}` };
}

// ------------------------------
// DELETE DOCUMENT
// ------------------------------
export async function deleteDocument(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    await fetch(`${API}/api/documents/${id}`, {
        method: "DELETE",
        headers,
    });
}

// ------------------------------
// MOVE TO TRASH
// ------------------------------
export async function trashDocument(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    await fetch(`${API}/api/documents/${id}/trash`, {
        method: "POST",
        headers,
    });
}

// ------------------------------
// RESTORE FROM TRASH
// ------------------------------
export async function restoreDocument(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    await fetch(`${API}/api/documents/${id}/restore`, {
        method: "POST",
        headers,
    });
}

// ------------------------------
// RENAME DOCUMENT
// ------------------------------
export async function renameDocument(id: string, newName: string): Promise<void> {
    const headers = await getAuthHeaders();
    await fetch(`${API}/api/documents/${id}/rename`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName }),
    });
}

// ------------------------------
// TOGGLE PUBLIC VISIBILITY
// ------------------------------
export async function togglePublic(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    await fetch(`${API}/api/documents/${id}/visibility`, {
        method: "POST",
        headers,
    });
}

// ------------------------------
// SHARE WITH USER
// ------------------------------
export async function shareDocument(id: string, username: string): Promise<void> {
    const headers = await getAuthHeaders();
    await fetch(`${API}/api/documents/${id}/share`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ collaborator: username }),
    });
}

// ------------------------------
// REMOVE COLLABORATOR
// ------------------------------

export async function removeCollaboratorAction(
    documentId: string,
    username: string,
    currentUsername: string
) {
    const headers = await getAuthHeaders();
    const isSelf = username === currentUsername;

    const payload = isSelf
        ? { remove: true }
        : { removeUsername: username };

    const res = await fetch(`${API}/api/documents/${documentId}/share`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to remove collaborator");
    }
    return await res.json();
}


// ------------------------------
// REVOKE SHARE LINK
// ------------------------------
export async function revokeShareLink(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    await fetch(`${API}/api/documents/${id}/revoke-share-link`, {
        method: "POST",
        headers,
    });
}

// ------------------------------
// GENERATE SHARE LINK
// ------------------------------
export async function generateShareLink(id: string): Promise<{ readOnlyLink?: string | null; shareToken?: string | null }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API}/api/documents/${id}/generate-share-link`, {
        method: "POST",
        headers,
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to generate share link");
    }

    return await res.json();
}

// ------------------------------
// COPY DOCUMENT
// ------------------------------
interface Editor {
    username: string;
}

interface DocumentData {
    name: string;
    content?: string;
    isVisibleNonAuth: boolean;
    editors: Editor[];
    filepath?: string;
}

export async function copyDocument(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    // 1) Fetch original document
    const docRes = await fetch(`${API}/api/documents/${id}`, {
        headers,
    });

    const data = await docRes.json();
    const doc: DocumentData = data.document ?? data;

    const form = new FormData();
    form.append("name", `Copy of ${doc.name}`);
    form.append("content", doc.content ?? "");
    form.append("isPublic", String(doc.isVisibleNonAuth));
    form.append("editors", doc.editors.map(e => e.username).join(","));

    // 2) If document has a file, fetch it
    if (doc.filepath) {
        const fileRes = await fetch(`${API}/api/uploads/${id}`, {
            headers,
        });

        if (fileRes.ok) {
            const blob = await fileRes.blob();
            const filename = doc.filepath.split("/").pop() ?? "file";
            form.append("file", blob, filename);
        }
    }

    // 3) Upload new document
    await fetch(`${API}/api/upload`, {
        method: "POST",
        headers,
        body: form,
    });
}
