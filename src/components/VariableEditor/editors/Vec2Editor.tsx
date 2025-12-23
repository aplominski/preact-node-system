import { h } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import { createPortal } from "preact/compat";
import type { FunctionalComponent } from "preact";
import "../VariableEditor.css";

type Props = {
    value: number[];
    onChange: (value: number[]) => void;
    disabled?: boolean;
};

export const Vec2Editor: FunctionalComponent<Props> = ({
    value,
    onChange,
    disabled = false,
}) => {
    // We'll use a popover submenu like Image/Color editors
    const [showMenu, setShowMenu] = useState(false);
    const [vecInternal, setVecInternal] = useState<string[]>(["0", "0"]);
    const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement | null>(null);
    const firstInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!showMenu) {
            if (Array.isArray(value) && value.length >= 2) {
                setVecInternal(value.slice(0, 2).map((v: any) => String(v)));
            } else {
                setVecInternal(["0", "0"]);
            }
        }
    }, [value, showMenu]);

    useEffect(() => {
        if (showMenu && firstInputRef.current) {
            firstInputRef.current.focus();
            firstInputRef.current.select();
        }
    }, [showMenu]);

    const openMenu = (e: MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPopoverPosition({ x: rect.left, y: rect.bottom + 6 });
        setShowMenu(true);
    };

    const handleVecChange = (index: number, val: string) => {
        const newVec = [...vecInternal];
        newVec[index] = val;
        setVecInternal(newVec);
    };

    const commitVecValue = () => {
        const nums = vecInternal.map((v) => parseFloat(v));
        if (nums.every((n) => !isNaN(n))) {
            onChange(nums);
        }
        setShowMenu(false);
    };

    const cancel = () => {
        setVecInternal(Array.isArray(value) && value.length >= 2 ? value.slice(0, 2).map(String) : ["0", "0"]);
        setShowMenu(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            e.stopPropagation();
            commitVecValue();
        } else if (e.key === "Escape") {
            e.stopPropagation();
            cancel();
        }
    };

    const handlePointerDown = (e: PointerEvent) => {
        e.stopPropagation();
    };

    if (disabled) return null;

    return (
        <div className="node-variable-editor-vec2" ref={containerRef} onPointerDown={handlePointerDown as any}>
            <div className="node-variable-editor-pill" onClick={openMenu as any} onPointerDown={(e) => e.stopPropagation()}>
                {Array.isArray(value) ? `${value[0]}, ${value[1]}` : "0, 0"}
            </div>

            {showMenu && createPortal(
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }}>
                    <div
                        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
                        onClick={commitVecValue}
                        onPointerDown={(e) => e.stopPropagation()}
                    />

                    <div className="node-color-popover" style={{ top: popoverPosition.y, left: popoverPosition.x }} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                        <div className="node-color-row">
                            <div className="node-color-label">X</div>
                            <input className="node-color-input" ref={firstInputRef} value={vecInternal[0]} onInput={(e) => handleVecChange(0, (e.target as HTMLInputElement).value)} onKeyDown={handleKeyDown as any} />
                        </div>
                        <div className="node-color-row">
                            <div className="node-color-label">Y</div>
                            <input className="node-color-input" value={vecInternal[1]} onInput={(e) => handleVecChange(1, (e.target as HTMLInputElement).value)} onKeyDown={handleKeyDown as any} />
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                            <button className="node-image-popover-button" onClick={(e) => { e.stopPropagation(); commitVecValue(); }}>OK</button>
                            <button className="node-image-popover-button" onClick={(e) => { e.stopPropagation(); cancel(); }}>Cancel</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
