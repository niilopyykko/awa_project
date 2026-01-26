'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'

type Props = {
    content: string
    onChange: (html: string) => void
}

export default function Tiptap({ content, onChange }: Props) {
    const editor = useEditor({
        extensions: [StarterKit],
        content,
        // Don't render immediately on the server to avoid SSR issues
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
    })

    useEffect(() => {
        if (!editor) return
        if (editor.getHTML() !== content) {
            editor.commands.setContent(content)
        }
    }, [content, editor])

    return (
        <EditorContent editor={editor} className='m-0 p-2 text-[color:var(--text)] bg-[color:var(--bg-input)] border-2 border-[color:var(--border)] rounded-md min-h-[100px]' />)
}