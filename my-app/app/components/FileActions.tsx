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

    return (
        <Dropdown>
            <DropdownTrigger>
                <Button variant="bordered" className="bg-blue-500 rounded-md text-lg">
                    Open Menu
                </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="File Actions" className="cursor-pointer">
                <DropdownItem key="share" onClick={handleShare}>
                    Share file
                </DropdownItem>
                <DropdownItem
                    key="delete"
                    className="text-danger"
                    color="danger"
                    onClick={handleDelete}
                >
                    Delete file
                </DropdownItem>
            </DropdownMenu>
        </Dropdown>
    );
}