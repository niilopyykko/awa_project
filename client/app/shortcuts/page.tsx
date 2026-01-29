export default function ShortcutsPage() {
    const shortcuts = [
        {
            category: 'Text Formatting',
            items: [
                { command: 'Bold', windows: 'Control + B', mac: 'Cmd + B' },
                { command: 'Italicize', windows: 'Control + I', mac: 'Cmd + I' },
                { command: 'Underline', windows: 'Control + U', mac: 'Cmd + U' },
                { command: 'Code', windows: 'Control + E', mac: 'Cmd + E' },
            ]
        },
        {
            category: 'Paragraph Formatting',
            items: [
                { command: 'Heading 1', windows: 'Control + Alt + 1', mac: 'Cmd + Alt + 1' },
                { command: 'Heading 2', windows: 'Control + Alt + 2', mac: 'Cmd + Alt + 2' },
                { command: 'Heading 3', windows: 'Control + Alt + 3', mac: 'Cmd + Alt + 3' },
                { command: 'Bullet list', windows: 'Control + Shift + 8', mac: 'Cmd + Shift + 8' },
                { command: 'Blockquote', windows: 'Control + Shift + B', mac: 'Cmd + Shift + B' },
            ]
        },
        {
            category: 'Essential',
            items: [
                { command: 'Copy', windows: 'Control + C', mac: 'Cmd + C' },
                { command: 'Cut', windows: 'Control + X', mac: 'Cmd + X' },
                { command: 'Paste', windows: 'Control + V', mac: 'Cmd + V' },
                { command: 'Undo', windows: 'Control + Z', mac: 'Cmd + Z' },
                { command: 'Redo', windows: 'Control + Shift + Z', mac: 'Cmd + Shift + Z' },
            ]
        }
    ]

    return (
        <div className="p-8 bg-background">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-text mb-2">Keyboard Shortcuts</h1>
                    <p className="text-text-muted">Quick reference for editor commands</p>
                </div>

                <div className="space-y-6">
                    {shortcuts.map((section) => (
                        <div key={section.category} className="border border-border rounded">
                            <div className="bg-bg-toolbar px-6 py-3">
                                <h2 className="text-lg font-semibold text-text">{section.category}</h2>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full bg-background">
                                    <thead className="bg-bg-toolbar border-b border-border">
                                        <tr>
                                            <th className="px-6 py-2 text-left text-sm font-semibold text-text">Command</th>
                                            <th className="px-6 py-2 text-left text-sm font-semibold text-text">Windows/Linux</th>
                                            <th className="px-6 py-2 text-left text-sm font-semibold text-text">macOS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {section.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-bg-toolbar">
                                                <td className="px-6 py-2 text-sm text-text">{item.command}</td>
                                                <td className="px-6 py-2 text-sm">
                                                    <code className="bg-bg-input px-2 py-1 rounded text-text font-mono text-xs border border-border">
                                                        {item.windows}
                                                    </code>
                                                </td>
                                                <td className="px-6 py-2 text-sm">
                                                    <code className="bg-bg-input px-2 py-1 rounded text-text font-mono text-sm border border-border">
                                                        {item.mac}
                                                    </code>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
