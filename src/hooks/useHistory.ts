import { useState, useCallback, useMemo } from "preact/hooks";

interface HistoryState<T> {
    past: T[];
    present: T;
    future: T[];
}

interface Actions<T> {
    set: (newPresent: T, options?: { replace?: boolean }) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    history: HistoryState<T>;
}

export function useHistory<T>(initialPresent: T, maxHistory: number = 50): Actions<T> {
    const [history, setHistory] = useState<HistoryState<T>>({
        past: [],
        present: initialPresent,
        future: [],
    });

    const canUndo = history.past.length > 0;
    const canRedo = history.future.length > 0;

    const undo = useCallback(() => {
        setHistory((curr) => {
            if (curr.past.length === 0) return curr;

            const previous = curr.past[curr.past.length - 1];
            const newPast = curr.past.slice(0, curr.past.length - 1);

            return {
                past: newPast,
                present: previous,
                future: [curr.present, ...curr.future],
            };
        });
    }, []);

    const redo = useCallback(() => {
        setHistory((curr) => {
            if (curr.future.length === 0) return curr;

            const next = curr.future[0];
            const newFuture = curr.future.slice(1);

            return {
                past: [...curr.past, curr.present],
                present: next,
                future: newFuture,
            };
        });
    }, []);

    const set = useCallback((newPresent: T, options: { replace?: boolean } = {}) => {
        setHistory((curr) => {
            if (options.replace) {
                return {
                    ...curr,
                    present: newPresent,
                };
            }

            const newPast = [...curr.past, curr.present];
            if (newPast.length > maxHistory) {
                newPast.shift();
            }

            return {
                past: newPast,
                present: newPresent,
                future: [],
            };
        });
    }, [maxHistory]);

    return useMemo(() => ({
        set,
        undo,
        redo,
        canUndo,
        canRedo,
        history
    }), [set, undo, redo, canUndo, canRedo, history]);
}
