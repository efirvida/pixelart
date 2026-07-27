import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

// ---- Types -----------------------------------------------------------------

export interface UndoEntry {
  row: number;
  col: number;
  /** The palette index that was applied *before* the undoable edit. */
  prevIndex: number;
}

export interface GridState {
  grid: number[][];
  palette: string[];
  originalImage: string | null;
  gridSize: number;
  undoStack: UndoEntry[];
}

export interface GridActions {
  /** Cycle a cell to the *next* palette colour. */
  setCellColor: (row: number, col: number) => void;
  /** Replace the entire grid/palette/image (e.g. after a new upload). */
  resetGrid: (
    grid: number[][],
    palette: string[],
    originalImage?: string | null,
  ) => void;
  /** Undo the most recent cell recolor. */
  undo: () => void;
}

// ---- Context ---------------------------------------------------------------

const StateCtx = createContext<GridState | null>(null);
const ActionsCtx = createContext<GridActions | null>(null);

// ---- Hook ------------------------------------------------------------------

export function useGrid(): GridState & GridActions {
  const state = useContext(StateCtx);
  const actions = useContext(ActionsCtx);
  if (!state || !actions) {
    throw new Error('useGrid must be used within a <GridProvider>');
  }
  return { ...state, ...actions };
}

// ---- Provider --------------------------------------------------------------

export function GridProvider({ children }: { children: ReactNode }) {
  const [grid, setGrid] = useState<number[][]>([]);
  const [palette, setPalette] = useState<string[]>([]);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState(0);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

  const setCellColor = useCallback(
    (row: number, col: number) => {
      setGrid((prev) => {
        // Deep-clone the row we're mutating.
        const next = prev.map((r) => [...r]);
        const prevIndex = next[row]?.[col];
        if (prevIndex === undefined) return prev; // out of bounds guard
        const newIndex = (prevIndex + 1) % palette.length;
        next[row][col] = newIndex;

        // Push undo entry.
        setUndoStack((stack) => [...stack, { row, col, prevIndex }]);

        return next;
      });
    },
    [palette.length],
  );

  const resetGrid = useCallback(
    (
      newGrid: number[][],
      newPalette: string[],
      newImage: string | null = null,
    ) => {
      setGrid(newGrid.map((r) => [...r]));
      setPalette([...newPalette]);
      setOriginalImage(newImage);
      setGridSize(newGrid.length > 0 ? newGrid[0].length : 0);
      setUndoStack([]);
    },
    [],
  );

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const next = [...stack];
      const entry = next.pop()!;

      setGrid((prev) => {
        const copy = prev.map((r) => [...r]);
        copy[entry.row][entry.col] = entry.prevIndex;
        return copy;
      });

      return next;
    });
  }, []);

  const state = useMemo<GridState>(
    () => ({ grid, palette, originalImage, gridSize, undoStack }),
    [grid, palette, originalImage, gridSize, undoStack],
  );

  const actions = useMemo<GridActions>(
    () => ({ setCellColor, resetGrid, undo }),
    [setCellColor, resetGrid, undo],
  );

  return (
    <StateCtx.Provider value={state}>
      <ActionsCtx.Provider value={actions}>{children}</ActionsCtx.Provider>
    </StateCtx.Provider>
  );
}
