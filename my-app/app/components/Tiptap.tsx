'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'



const Tiptap = () => {
    const editor = useEditor({
        extensions: [StarterKit],
        content: '<p>Text Here</p>',
        // Don't render immediately on the server to avoid SSR issues
        immediatelyRender: false,
    })

    useEffect(() => {
        if (!editor) return

        const saved = localStorage.getItem("doc")
        if (saved) {
            editor.commands.setContent(saved)
        }
    }, [editor])

    const save = () => {
        const content = editor?.getHTML()
        if (!content) return

        localStorage.setItem("doc", content)
        alert("Saved")
    }

    return (
        <div>
            <button onClick={save} className='rounded mb-2 bg-blue-400 '>Save</button>
            <EditorContent editor={editor} className=' shadow-md m-0 p-0 text-blue-950' />
        </div>)

}

export default Tiptap