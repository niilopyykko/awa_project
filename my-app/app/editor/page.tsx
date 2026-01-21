import Link from 'next/link'
import Tiptap from '../components/Tiptap'

export default function Editor() {
    return <div className="min-h-screen bg-blue-50 p-8">

        <div className="max-w-4xl mx-auto">
            <div className="mb-8 shadow-md">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">TextEditor</h1>
                <p className="text-gray-600">Basic formatting tools</p>
                <ul className='bg-gray-100 border-b border-gray-200'>
                    <li>
                        <span className='px-6 py-2 text-left text-sm font-semibold text-gray-700'>BOLD</span> <span className='pl-10 py-2 text-left text-sm font-semibold text-violet-700'>= CTRL+B</span>
                    </li>
                    <li>
                        <span className='px-6 py-2 text-left text-sm font-semibold text-gray-700'>ITALIC</span> <span className='pl-9 py-2 text-left text-sm font-semibold text-violet-700'>= CTRL+I</span>
                    </li>
                    <li>
                        <span className='px-6 py-2 text-left text-sm font-semibold text-gray-700'>UNDERLINE</span> <span className=' py-2 text-left text-sm font-semibold text-violet-700'>= CTRL+U</span>
                    </li>
                    <li>
                        <span className='pl-6 py-2 text-left text-sm font-semibold text-gray-700'>MORE @ </span><Link href="/shortcuts" className=' py-2 text-left text-sm font-semibold text-gray-700 underline'>HERE</Link> <span className='bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono text-xs'>Some keybinds may not work</span>
                    </li>
                </ul>

            </div >
            <div className='bg-blue-200 rounded-lg shadow-md p-2 py-0'>
                <Tiptap />
            </div>
        </div >
    </div >
}