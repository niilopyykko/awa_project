"use client";
import Image from "next/image";
import FileActions from "./FileActions";
import { IDocument, IUser } from "../../src/types";
import { useRouter } from "next/navigation";

interface Props {
    doc: IDocument;
    jwt?: string | null;
    currentUser?: string | null;
    onUpdated?: (opts?: { switchToDrive?: boolean }) => void;
}

export default function DocumentCard({ doc, currentUser, onUpdated }: Props) {
    const router = useRouter();
    const filepath = doc.filepath ?? '';
    const filename = filepath ? (filepath.split('/').pop() || filepath.split('\\').pop() || '') : '';
    const fileUrl = filename ? `http://localhost:3001/uploads/${filename}` : '';
    const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'avif'].includes(ext);
    const isGif = ext === 'gif';
    const isVideo = ['mp4', 'webm', 'ogg'].includes(ext);
    const isTrashed = Boolean(doc.trash);

    const renderPlainText = (html: string) => {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || '';
    }

    return (
        <div className="relative flex items-center gap-4 p-4 bg-amber-800 border-amber-200 border-2 rounded">
            <div className="flex-1">
                <h3 className="font-bold">{doc.name}</h3>
                <div className="text-sm">Uploaded by: {doc.owner.username} - {new Date(doc.createdAt).toLocaleString()}</div>
                <div className="text-md rounded-2xl bg-blue-200 w-fit px-2 text-black  my-2">FILE IS {doc.isVisibleNonAuth ? (<span className="bg-fuchsia-300 rounded-2xl px-2 text-red-600 text-shadow-2xs">Public</span>) : <span className="bg-yellow-300 rounded-2xl px-2 text-green-600 text-shadow-2xs">Private</span>}</div>
                <div className="mt-2">
                    {filename ? (
                        isVideo ? (
                            <video src={fileUrl} controls className="max-h-40" />
                        ) : isGif || isImage ? (
                            <Image src={fileUrl} alt={doc.name} width={400} height={200} unoptimized className="object-contain" />
                        ) : (
                            <a href={fileUrl} target="_blank" rel="noreferrer" className="underline">Download</a>
                        )
                    ) : (
                        <div
                            onClick={() => {
                                if (isTrashed) return;
                                if (!filename && doc.content) {
                                    try {
                                        sessionStorage.setItem('editorContent', doc.content || '');
                                        sessionStorage.setItem('editorName', doc.name);
                                        sessionStorage.setItem('editorId', doc._id);
                                        sessionStorage.setItem('editorEditors', (doc.editors?.map((e: IUser) => e.username) ?? []).join(', '));
                                        sessionStorage.setItem('editorIsPublic', String(doc.isVisibleNonAuth));
                                        router.push('/editor');
                                    } catch (err) { console.error('Could not open editor', err) }
                                }
                            }}
                            className={`mt-2 w-full h-40 flex items-center justify-center overflow-hidden rounded-2xl bg-amber-900 shadow-2xl p-2 ${isTrashed ? 'cursor-not-allowed pointer-events-none opacity-60' : 'cursor-pointer'}`}
                        >
                            <p>{renderPlainText(doc.content || '')}</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="absolute top-2 right-2">
                <FileActions
                    fileId={doc._id}
                    fileName={doc.name}
                    isTrashed={Boolean(doc.trash)}
                    fileOwner={doc.owner?.username ?? ''}
                    editors={doc.editors?.map(e => e.username) ?? []}
                    currentUsername={currentUser ?? undefined}
                    onUpdated={onUpdated}
                />
            </div>
            {doc.trash ? (<span className="absolute left-2 top-2 bg-red-600 text-white px-2 py-0.5 rounded">Trashed</span>) : null}
        </div>
    )
}
