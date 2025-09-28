import {DropZoneProps} from "./DropZoneProps.tsx";

export interface DragItemProps {
    id: number,
    name: string,
    onDropIntoTree?: (dragged: { id: number; name: string }, dropResult?: DropZoneProps) => void;

}