import { h } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import { createPortal } from "preact/compat";
import type { FunctionalComponent } from "preact";
import "../VariableEditor.css";

type Props = {
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
};

export const NumberEditor: FunctionalComponent<Props> = ({
    value,
    onChange,
    disabled = false,
}) => {
    const getDisplayValue = (val: any) => {
        if (val !== undefined && val !== null) {
            return val.toString();
        }
        return "0";
    };

    const [showMenu, setShowMenu] = useState(false);
    const [tempValue, setTempValue] = useState(() => getDisplayValue(value));
    const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
    const inputRef = useRef<HTMLInputElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Sync from parent prop when menu is closed
    useEffect(() => {
        if (!showMenu) setTempValue(getDisplayValue(value));
    }, [value, showMenu]);

    // focus input when menu opens
    useEffect(() => {
        if (showMenu && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [showMenu]);

    const openMenu = (e: MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPopoverPosition({ x: rect.left, y: rect.bottom + 6 });
        setTempValue(getDisplayValue(value));
        setShowMenu(true);
    };

    const commit = () => {
        const n = parseFloat(tempValue as string);
        if (!isNaN(n)) onChange(n);
        setShowMenu(false);
    };

    const cancel = () => {
        setTempValue(getDisplayValue(value));
        setShowMenu(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            e.stopPropagation();
            commit();
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
        <div ref={containerRef} style={{ display: "inline-block" }} onPointerDown={handlePointerDown as any}>
            <div
                className="node-variable-editor node-variable-editor-number node-variable-display node-variable-editor-pill"
                onClick={openMenu as any}
                title="Click to edit"
            >
                {getDisplayValue(value)}
            </div>

            {showMenu && createPortal(
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }}>
                    <div
                        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
                        onClick={commit}
                        onPointerDown={(e) => e.stopPropagation()}
                    />

                    <div
                        className="node-color-popover"
                        style={{ top: popoverPosition.y, left: popoverPosition.x }}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <div className="node-color-row">
                            <div className="node-color-label">Value</div>
                            <input
                                ref={inputRef}
                                className="node-color-input"
                                value={tempValue}
                                onInput={(e) => setTempValue((e.target as HTMLInputElement).value)}
                                onKeyDown={handleKeyDown as any}
                                onPointerDown={(e) => e.stopPropagation()}
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                            <button className="node-image-popover-button" onClick={(e) => { e.stopPropagation(); commit(); }}>OK</button>
                            <button className="node-image-popover-button" onClick={(e) => { e.stopPropagation(); cancel(); }}>Cancel</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
