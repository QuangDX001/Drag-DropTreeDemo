import React, { useRef } from "react";
import { DropZoneProps } from "../interfaces/DropZoneProps";
import {
  PlayCircleOutlined,
  PlusOutlined,
  CopyOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

type Props = DropZoneProps & {
  onPlay?: (id: number) => void;
  onAddChild?: (id: number) => void;
  onDuplicate?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
};

export const TreeItem: React.FC<Props> = ({
  id,
  level,
  name,
  onPlay,
  onAddChild,
  onDuplicate,
  onEdit,
  onDelete,
}) => {
  const stop: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div className={`ant-tree-title-wrapper level-${level}`}>
      <div
        className="ant-tree-title-content"
        style={{ marginLeft: (level - 1) * 24 , display: "flex", alignItems: "center", gap: 8 }}
      >
        <span>
          {name} (id = {id})
        </span>

        <span
          style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}
          onMouseDown={stop}
          onClick={stop}
        >
          <button
            className="action-btn play"
            title="Run"
            onClick={() => onPlay?.(id)}
          >
            <PlayCircleOutlined />
          </button>
          <button
            className="action-btn add"
            title="Add child"
            onClick={() => onAddChild?.(id)}
          >
            <PlusOutlined />
          </button>
          <button
            className="action-btn dup"
            title="Duplicate"
            onClick={() => onDuplicate?.(id)}
          >
            <CopyOutlined />
          </button>
          <button
            className="action-btn edit"
            title="Edit"
            onClick={() => onEdit?.(id)}
          >
            <EditOutlined />
          </button>
          <button
            className="action-btn del"
            title="Delete"
            onClick={() => onDelete?.(id)}
          >
            <DeleteOutlined />
          </button>
        </span>
      </div>
    </div>
  );
};
