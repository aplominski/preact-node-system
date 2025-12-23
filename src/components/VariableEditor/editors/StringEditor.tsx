import { h } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import { createPortal } from "preact/compat";
import type { FunctionalComponent } from "preact";
import "../VariableEditor.css";

type Props = {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
};

export const StringEditor: FunctionalComponent<Props> = ({ value, onChange, disabled = false }) => {
    const getDisplayValue = (val: any) => {
        if (val === undefined || val === null) return "";
        const str = String(val).replace(/\r?\n/g, ' ');
        const max = 12; // show only the beginning in the compact pill
        return str.length > max ? str.slice(0, max) + '...' : str;
    };

    const [showMenu, setShowMenu] = useState(false);
    const [tempValue, setTempValue] = useState(() => value ?? "");
    const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!showMenu) setTempValue(value ?? "");
    }, [value, showMenu]);

    useEffect(() => {
        if (showMenu && inputRef.current) {
            (inputRef.current as HTMLInputElement | HTMLTextAreaElement).focus();
            // place caret at end
            const el = inputRef.current as HTMLInputElement | HTMLTextAreaElement;
            if (typeof el.selectionStart === "number") {
                const pos = el.value ? el.value.length : 0;
                el.selectionStart = el.selectionEnd = pos;
            }
        }
    }, [showMenu]);

    const openMenu = (e: MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPopoverPosition({ x: rect.left, y: rect.bottom + 6 });
        setTempValue(value ?? "");
        setShowMenu(true);
    };

    const commit = () => {
        onChange(tempValue);
        setShowMenu(false);
    };

    const cancel = () => {
        setTempValue(value ?? "");
        setShowMenu(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) {
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

    const isMultiline = (tempValue ?? "").includes("\n");

    return (
        <div ref={containerRef} style={{ display: "inline-block" }} onPointerDown={handlePointerDown as any}>
            <div
                className="node-variable-editor node-variable-display node-variable-editor-pill node-variable-editor-string"
                onClick={openMenu as any}
                title="Click to edit"
            >
                <span className="node-variable-editor-string-text">{getDisplayValue(value)}</span>
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
                            {isMultiline ? (
                                <textarea
                                    ref={inputRef as any}
                                    className="node-color-input"
                                    rows={4}
                                    value={tempValue}
                                    onInput={(e) => setTempValue((e.target as HTMLTextAreaElement).value)}
                                    onKeyDown={handleKeyDown as any}
                                    onPointerDown={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <input
                                    ref={inputRef as any}
                                    className="node-color-input"
                                    value={tempValue}
                                    onInput={(e) => setTempValue((e.target as HTMLInputElement).value)}
                                    onKeyDown={handleKeyDown as any}
                                    onPointerDown={(e) => e.stopPropagation()}
                                />
                            )}
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

export default StringEditor;
