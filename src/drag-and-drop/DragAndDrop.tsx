import { JSX, useState, useRef } from "react";
import { DndProvider } from "react-dnd";
import { TouchBackend } from "react-dnd-touch-backend";
import { usePreview } from "react-dnd-preview";
import { Tree } from "antd";
import { DragItemProps } from "./interfaces/DragItemProps.tsx";
import { StyledDragAndDrop } from "./css/StyledDragAndDrop.tsx";
import { DragItem } from "./components/DragItem.tsx";
import { DropZone } from "./components/DropZone.tsx";
import {DropZoneProps} from "./interfaces/DropZoneProps.tsx";
import {toTree} from "./components/GenerateTree.tsx";
import {dataSample} from "./const/DataSample.ts";

type TreeItemType = {
  id: number;
  key: string;
  title: string;
  level: number;
  children?: TreeItemType[];
};

const DragAndDrop = () => {
  const [listData, setListData] = useState<TreeItemType[]>(() => toTree(dataSample));

  const setLevels = (nodes: TreeItemType[], parentLevel = 0) => {
    for (const n of nodes) {
      n.level = parentLevel + 1;
      if (n.children?.length) setLevels(n.children, n.level);
    }
  };

  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

  const findLoc = (
      arr: TreeItemType[],
      id: number
  ): { node: TreeItemType; index: number; parentArr: TreeItemType[] } | null => {
    for (let i = 0; i < arr.length; i++) {
      const n = arr[i];
      if (n.id === id) return {node: n, index: i, parentArr: arr};
      if (n.children) {
        const hit = findLoc(n.children, id);
        if (hit) return hit;
      }
    }
    return null;
  };

  const useIdGen = (start = 1000) => {
    const ref = useRef(start);
    return () => ++ref.current;
  };
  const makeKey = (id: number) => String(id);

  const cloneSubtreeWithNewIds = (node: TreeItemType, nextId: () => number): any => {
    const id = nextId();
    return {
      ...node,
      id,
      key: makeKey(id),
      children: node.children?.map((c: any) =>
          cloneSubtreeWithNewIds(c, nextId)
      ),
    };
  };

  const findParentIdByChildId = (list: TreeItemType[], childId: number): number | null => {
    for (const n of list) {
      const kids = n.children || [];
      if (kids.some((k: any) => k.id === childId)) return n.id;
      if (kids.length) {
        const p = findParentIdByChildId(kids, childId);
        if (p != null) return p;
      }
    }
    return null;
  };
  
  const DragItemPreview = (): JSX.Element | null => {
    const preview = usePreview<DragItemProps, Element>();
    if (!preview.display) {
      return null;
    }
    const { itemType, item, style } = preview;
    return (
      <div className="drag-item is-dragging" style={style}>
        {item.name} (id = {item.id})
      </div>
    );
  };
  
  const onDragEnter = (info: any) => {
    // console.log(info);
  };

  const onDrop = (info: any) => {
    const dropKey = info.node.key;
    const dragKey = info.dragNode.key;

    if (!info.dragNode || !info.dragNode.key) {
      return; 
    }

    const dropPosParts = String(info.node.pos).split("-");
    const dropPosition =
        info.dropPosition - Number(dropPosParts[dropPosParts.length - 1]);

    const parentPos = (pos: string) => pos.split("-").slice(0, -1).join("-");
    const sameParent = parentPos(info.dragNode.pos) === parentPos(info.node.pos);

    const data = clone<TreeItemType[]>(listData);

    const loop = (arr: TreeItemType[], key: string, cb: (item: TreeItemType, index: number, a: TreeItemType[]) => void) => {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].key === key) return cb(arr[i], i, arr);
        if (arr[i].children) loop(arr[i].children!, key, cb);
      }
    };

    let dragObj: TreeItemType | undefined;
    loop(data, dragKey, (_item, index, arr) => {
      const removed = arr.splice(index, 1);
      dragObj = removed[0];
    });
    if (!dragObj) {
      console.warn("Drag node not found – ignoring drop.");
      return;
    }

    const dragged: TreeItemType = dragObj;

    //insert
    if (!info.dropToGap) {
      if (sameParent) {
        // center + same parent 
        loop(data, dropKey, (_target, targetIdx, targetArr) => {
          targetArr.splice(targetIdx, 0, dragged);
        });
      } else {
        // center + different parent 
        loop(data, dropKey, (target) => {
          target.children = target.children || [];
          target.children.unshift(dragged);
        });
      }
    } else {
      // before/after among siblings
      loop(data, dropKey, (_target, targetIdx, targetArr) => {
        const insertAt = dropPosition === -1 ? targetIdx : targetIdx + 1;
        targetArr.splice(insertAt, 0, dragged);
      });
    }

    let parent_id: number | null = null;
    let after_id: number | null = null;

    if (!info.dropToGap) {
      parent_id = Number(info.node.id);
      after_id = null;
    } else {
      parent_id = findParentIdByChildId(data, Number(info.node.id));
      if (dropPosition === -1) {
        let prev: TreeItemType | null = null;
        loop(data, dropKey, (_item, index, arr) => {
          prev = arr[index - 1] ?? null;
        });
        // @ts-ignore
        after_id = prev?.id ?? null;
      } else {
        after_id = Number(info.node.id);
      }
    }

    setLevels(data, 0);
    setListData(data);

    console.log("Drag Obj", dragged);
    console.log("Target Obj", info.node);
    console.log("id", dragged.id);
    console.log("parent_id", parent_id);
    console.log("after_id", after_id);
    console.log("----------------");
  };

  const handleExternalDrop = (
      dragged: { id: number; name: string },
      dropResult?: DropZoneProps
  ) => {
    setListData(prev => {
      const cloneTree = (nodes: TreeItemType[]): TreeItemType[] =>
          nodes.map(n => ({
            ...n,
            children: n.children ? cloneTree(n.children) : [],
          }));
      const data = cloneTree(prev);

      const newId = nextId();
      const newNode: TreeItemType = {
        id: newId,
        key: `zone-${newId}`,   
        title: dragged.name,
        level: 1,              
        children: [],
      };

      if (dropResult) {
        const loc = findLoc(data, dropResult.id);
        if (loc) {
          const kids = loc.node.children ?? [];
          const alreadyExists = kids.some((c) => c.title === dragged.name);
          if (!alreadyExists) {
            loc.node.children = [...kids, newNode];
          }
        }
      } else {
        // root insert
        const alreadyExists = data.some((c) => c.id === dragged.id);
        if (!alreadyExists) {
          data.push(newNode);
        }
      }

      setLevels(data, 0);       
      return data;               
    });
  };



  // ------- action handlers -------
  const nextId = useIdGen();

  const handlePlay = (id: number) => {
    console.log("play", id);
  };

  const handleAddChild = (parentId: number) => {
    setListData((prev) => {
      const data = clone(prev);
      const loc = findLoc(data, parentId);
      if (!loc) return prev;
      const parent = loc.node;
      parent.children = parent.children || [];
      const id = nextId();
      parent.children.push({
        id,
        key: makeKey(id),
        title: "New item",
        level: (parent.level ?? 0) + 1,
        children: [],
      });
      setLevels(data, 0);
      return data;
    });
  };

  const handleDuplicate = (id: number) => {
    setListData((prev) => {
      const data = clone(prev);
      const loc = findLoc(data, id);
      if (!loc) return prev;
      const copy = cloneSubtreeWithNewIds(loc.node, nextId);
      copy.title = `${copy.title} (copy)`;
      loc.parentArr.splice(loc.index + 1, 0, copy);
      setLevels(data, 0);
      return data;
    });
  };

  const handleEdit = (id: number) => {
    const newTitle = prompt("Rename item:");
    if (newTitle == null) return;
    setListData((prev) => {
      const data = clone(prev);
      const loc = findLoc(data, id);
      if (!loc) return prev;
      loc.node.title = newTitle;
      return data;
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this item (and its children)?")) return;
    setListData((prev) => {
      const data = clone(prev);
      const loc = findLoc(data, id);
      if (!loc) return prev;
      loc.parentArr.splice(loc.index, 1);
      setLevels(data, 0);
      return data;
    });
  };

  return (
    <StyledDragAndDrop>
      <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
        <div className="mb-3">
          <DragItem id={1} name="Zone 1" onDropIntoTree={handleExternalDrop} />
          <DragItem id={2} name="Zone 2" onDropIntoTree={handleExternalDrop} />
          <DragItem id={3} name="Zone 3" onDropIntoTree={handleExternalDrop} />
          <DragItemPreview />
        </div>
        <Tree
          className="draggable-tree"
          draggable
          blockNode
          defaultExpandAll
          onDrop={onDrop}
          treeData={listData}
          titleRender={(item) => (
            <DropZone
              id={item.id}
              level={item.level}
              name={item.title}
              onPlay={handlePlay}
              onAddChild={handleAddChild}
              onDuplicate={handleDuplicate}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        />
      </DndProvider>
    </StyledDragAndDrop>
  );
};

export default DragAndDrop;
