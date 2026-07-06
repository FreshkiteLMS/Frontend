import {
    LayoutGrid,
    Hash,
    Network,
    ListTree,
    Triangle,
    Search,
    Link as LinkIcon,
    Layers,
    List,
    Grid3x3,
    Calculator,
    Spline,
    Undo2,
    Coins,
    ArrowLeftRight,
    RectangleHorizontal,
    Ruler,
    Binary,
    Table,
    Type,
    Folder,
    type LucideIcon,
} from 'lucide-react';

/**
 * Maps the backend-assigned section icon NAME to a Lucide component. The backend
 * stays icon-library-agnostic (it only stores a name); this is the single place
 * the name becomes a concrete icon, with a Folder fallback.
 */
const ICONS: Record<string, LucideIcon> = {
    array: LayoutGrid,
    hash: Hash,
    graph: Network,
    tree: ListTree,
    heap: Triangle,
    'binary-search': Search,
    'linked-list': LinkIcon,
    stack: Layers,
    queue: List,
    dp: Grid3x3,
    math: Calculator,
    trie: Spline,
    backtracking: Undo2,
    greedy: Coins,
    'two-pointer': ArrowLeftRight,
    'sliding-window': RectangleHorizontal,
    interval: Ruler,
    bit: Binary,
    matrix: Table,
    string: Type,
    folder: Folder,
};

export function getSectionIcon(name: string): LucideIcon {
    return ICONS[name] ?? Folder;
}
