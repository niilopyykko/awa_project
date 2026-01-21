import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react";

interface FileActionsProps {
    fileId: string;
    fileName: string;
}

export default function FileActions({ fileId, fileName }: FileActionsProps) {
    const handleShare = () => {
        // Share logic here
        console.log(`Sharing file: ${fileName}`);
    };

    const handleDelete = () => {
        // Delete logic here
        console.log(`Deleting file: ${fileId}`);
    };
    const handleRename = () => {
        // rename logic here
        console.log(`Renaming file: ${fileId}`);
    };

    return (
        <Dropdown>
            <DropdownTrigger>
                <Button variant="bordered" className="bg-blue-500 rounded-md text-lg">
                    Open Menu
                </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="File Actions" className="cursor-pointer bg-blue-200 rounded-md text-black">
                <DropdownItem
                    key="rename"
                    className="cursor-pointer m-1 px-1 text-center size-auto bg-blue-300 rounded-md text-black"
                    onClick={handleRename}
                >Rename
                </DropdownItem>
                <DropdownItem key="share" onClick={handleShare} className="cursor-pointer m-1 px-1 text-center size-auto bg-blue-300 rounded-md text-black">
                    Share
                </DropdownItem >
                <DropdownItem
                    key="delete"
                    className="text-danger cursor-pointer m-1 px-1 text-center size-auto bg-red-300 rounded-md text-red-950"
                    color="danger"
                    onClick={handleDelete}
                >
                    Delete
                </DropdownItem>
            </DropdownMenu>
        </Dropdown>
    );
}