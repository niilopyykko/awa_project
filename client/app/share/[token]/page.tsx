import { notFound } from "next/navigation";
import Image from "next/image";

type ShareDoc = {
    id: string;
    name: string;
    owner: string | null;
    content: string | null;
    filepath: string | null;
    fileUrl: string | null;
};

type ShareResponse = {
    document: ShareDoc;
};

export default async function SharePage(props: {
    params: { token: string } | Promise<{ token: string }>
}) {
    const { token } = await props.params;

    const BACKEND = process.env.BACKEND_URL || "http://localhost:3001";

    const res = await fetch(`${BACKEND}/api/share/${token}`, {
        cache: "no-store",
    });

    if (!res.ok) return notFound();

    const data = (await res.json()) as ShareResponse;
    const doc = data.document;

    const fileUrl = `/share/${token}/file`;

    const ext = doc.filepath?.split(".").pop()?.toLowerCase();
    const isImage = ext ? ["png", "jpg", "jpeg", "webp", "gif", "avif"].includes(ext) : false;
    const isVideo = ext ? ["mp4", "webm", "ogg"].includes(ext) : false;

    return (
        <div className="w-screen text-foreground flex flex-col items-center justify-center">
            <div className="w-full flex flex-col items-center px-4 py-6">

                {/* Title + Owner */}
                <div className="w-full max-w-2xl text-center mb-6">
                    <h1 className="text-3xl font-semibold mb-1">{doc.name}</h1>
                    {doc.owner && (
                        <p className="text-sm text-text-muted">Uploaded by {doc.owner}</p>
                    )}
                </div>

                {/* FILE CONTENT */}
                {doc.filepath ? (
                    <>
                        {/* IMAGE */}
                        {isImage && (
                            <div className="relative w-full min-h-[40vh] h-[75vh] flex items-center justify-center">
                                <Image
                                    src={`${fileUrl}?img=1`}
                                    alt={doc.name}
                                    fill
                                    sizes="100vw"
                                    className="object-contain rounded-xl mx-auto"
                                    priority
                                />
                            </div>
                        )}

                        {/* VIDEO */}
                        {isVideo && (
                            <div className="w-full h-[75vh] flex items-center justify-center">
                                <video
                                    src={fileUrl}
                                    controls
                                    className="w-full h-full rounded-xl shadow-xl object-contain bg-black"
                                />
                            </div>
                        )}

                        {/* OTHER FILES */}
                        {!isImage && !isVideo && (
                            <div className="flex flex-col items-center mt-6">
                                <a
                                    href={`${fileUrl}?download=1`}
                                    className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-3 text-white font-medium shadow hover:bg-blue-700 transition"
                                >
                                    Download file
                                </a>
                            </div>
                        )}
                    </>
                ) : (
                    /* TEXT CONTENT (NO SCROLL, MAX SIZE) */
                    <div className="w-full flex justify-center">
                        <div
                            className="
                w-full max-w-3xl
                rounded-xl
                border border-border
                bg-bg-toolbar
                p-8
                shadow-xl
                text-lg
                leading-relaxed
                whitespace-pre-wrap
            "
                        >
                            <div
                                dangerouslySetInnerHTML={{ __html: doc.content || "No content available" }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}