import {JSX, useState, useRef} from "react";
import {Tree} from "antd";
import {StyledDragAndDrop} from "./css/StyledDragAndDrop.tsx";
import {TreeItem} from "./components/TreeItem.tsx";
import {dataSample} from "./const/DataSample.ts";
import {toTree} from "./components/GenerateTree.tsx";

type TreeItemType = {
    id: number;
    key: string;
    title: string;
    level: number;
    children?: TreeItemType[];
};

const TreeSorted = () => {
    const [listData, setListData] = useState<TreeItemType[]>(() => toTree(dataSample));

    const setLevels = (nodes: TreeItemType[], depth = 1) => {
        for (const n of nodes) {
            n.level = depth;
            if (n.children?.length) setLevels(n.children, depth + 1);
        }
    };

    const clone = <T, >(x: T): T => JSON.parse(JSON.stringify(x));

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

    const onDrop = (info: any) => {
        const dropKey = info.node.key;
        const dragKey = info.dragNode.key;

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
            dragObj = removed[0]; // TreeItemType | undefined
        });
        if (!dragObj) {
            console.warn("Drag node not found – ignoring drop.");
            return;
        }

        const dragged: TreeItemType = dragObj;

        //insert
        if (!info.dropToGap) {
            if (sameParent) {
                // center + same parent => REORDER (insert before the target)
                loop(data, dropKey, (_target, targetIdx, targetArr) => {
                    targetArr.splice(targetIdx, 0, dragged);
                });
            } else {
                // center + different parent => make first child (default behavior)
                loop(data, dropKey, (target) => {
                    target.children = target.children || [];
                    target.children.unshift(dragged);
                });
            }
        } else {
            // GAP => before/after among siblings
            loop(data, dropKey, (_target, targetIdx, targetArr) => {
                const insertAt = dropPosition === -1 ? targetIdx : targetIdx + 1;
                targetArr.splice(insertAt, 0, dragged);
            });
        }

        // metadata
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

        setLevels(data, 1);
        setListData(data);

        console.log("Drag Obj", dragged);
        console.log("Target Obj", info.node);
        console.log("id", dragged.id);
        console.log("parent_id", parent_id);
        console.log("after_id", after_id);
        console.log("----------------");
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
            setLevels(data, 1);
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
            setLevels(data, 1);
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
            setLevels(data, 1);
            return data;
        });
    };

    return (
        <StyledDragAndDrop>
            <Tree
                className="draggable-tree"
                draggable
                blockNode
                defaultExpandAll
                onDrop={onDrop}
                treeData={listData}
                titleRender={(item) => (
                    <TreeItem
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
        </StyledDragAndDrop>
    );
};

export default TreeSorted;
