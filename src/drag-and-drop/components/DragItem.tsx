import { DragItemProps } from "../interfaces/DragItemProps";
import React, { useRef } from "react";
import { useDrag } from "react-dnd";
import { DropZoneProps } from "../interfaces/DropZoneProps";

export const DragItem: React.FC<DragItemProps> = ({ id, name, onDropIntoTree  }) => {
  const elementRef = useRef<HTMLDivElement | null>(null);

  const [{ isDragging }, drag] = useDrag<
    DragItemProps,
    DropZoneProps,
    { isDragging: boolean }
  >(
    () => ({
      type: "box",
      item: { id, name },
      end: (item, monitor) => {
        const dropResult = monitor.getDropResult();
        if (item && dropResult) {
          // alert(
          //   `You dropped ${item.name} (id = ${item.id}) into ${dropResult.name} (id = ${dropResult.id})!`
          // );
             
            // @ts-ignore
            onDropIntoTree(item, dropResult); 
        }
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [id, name]
  );

  drag(elementRef);

  return (
    <div
      className={"drag-item " + (isDragging ? "is-dragging" : "")}
      ref={elementRef}
    >
      {name} (id = {id})
    </div>
  );
};
