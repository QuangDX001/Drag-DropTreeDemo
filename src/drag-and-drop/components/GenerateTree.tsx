import {DataType} from "../const/type.ts";

type Node = {
    id: number;
    key: string;
    title: string;
    level: number;
    children?: Node[];
};

export function toTree(rows: DataType[]): Node[] {
    // group by ParentId, sort siblings by Ord
    const byParent = new Map<number | null, DataType[]>();
    for (const r of rows) {
        const k = r.ParentId ?? null;
        if (!byParent.has(k)) byParent.set(k, []);
        byParent.get(k)!.push(r);
    }
    for (const list of byParent.values()) list.sort((a, b) => a.Ord - b.Ord);

    const build = (parentId: number | null): Node[] =>
        (byParent.get(parentId) ?? []).map(r => ({
            id: r.Id,
            key: `node-${r.Id}`,
            title: r.Title,
            level: r.Level,
            children: build(r.Id),
        }));

    return build(null);
}
