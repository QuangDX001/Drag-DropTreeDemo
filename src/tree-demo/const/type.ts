export type DataType = {
    Id: number;
    WorkId: number;
    ParentId: number | null;
    Type: 1 | 2;          // 1 = Step, 2 = Group Step
    Title: string;
    Ord: number;          
    Level: number;        
};
