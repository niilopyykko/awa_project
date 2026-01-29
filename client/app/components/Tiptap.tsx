'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'


type Props = {
    content: string
    onChange: (html: string) => void
    editable?: boolean
}


export default function Tiptap({ content, onChange, editable = true }: Props) {
    const editor = useEditor({
        extensions: [StarterKit],
        content,
        editable,
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

    // Ensure editor's editable state updates when prop changes
    useEffect(() => {
        if (editor) {
            editor.setEditable(editable)
        }
    }, [editable, editor])

    return (
        <EditorContent editor={editor} className='m-0 p-2 text-text bg-bg-input border-2 border-border rounded-md min-h-25' />)
}