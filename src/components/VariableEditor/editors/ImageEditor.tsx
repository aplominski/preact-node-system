import { h } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import { createPortal } from "preact/compat";
import type { FunctionalComponent } from "preact";
import "../VariableEditor.css";

type Props = {
    value?: string | null;
    onChange: (value: string | null) => void;
    disabled?: boolean;
};

export const ImageEditor: FunctionalComponent<Props> = ({ value, onChange, disabled = false }) => {
    const [preview, setPreview] = useState<string | null>(value || null);
    const [showMenu, setShowMenu] = useState(false);
    const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
    const inputRef = useRef<HTMLInputElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setPreview(value || null);
    }, [value]);

    if (disabled) return null;

    const handleFile = (file: File | null) => {
        if (!file) {
            setPreview(null);
            onChange(null);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string | ArrayBuffer | null;
            if (typeof result === "string") {
                setPreview(result);
                onChange(result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleInputChange = (e: Event) => {
        const t = e.target as HTMLInputElement;
        const f = t.files && t.files[0] ? t.files[0] : null;
        handleFile(f);
        setShowMenu(false);
    };

    const openMenu = (e: MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPopoverPosition({ x: rect.left, y: rect.bottom + 6 });
        setShowMenu(!showMenu);
    };

    const handleUploadClick = () => {
        if (inputRef.current) inputRef.current.click();
    };

    const handleDelete = (e: MouseEvent) => {
        e.stopPropagation();
        setPreview(null);
        onChange(null);
        if (inputRef.current) inputRef.current.value = "";
        setShowMenu(false);
    };

    const handleView = (e: MouseEvent) => {
        e.stopPropagation();
        if (preview) {
            // Open larger view in new window/tab
            window.open(preview, "_blank");
        }
        setShowMenu(false);
    };

    const handlePointerDown = (e: PointerEvent) => {
        e.stopPropagation();
    };

    useEffect(() => {
        if (!showMenu) return;

        const onDocClick = () => setShowMenu(false);
        window.addEventListener("click", onDocClick);
        return () => window.removeEventListener("click", onDocClick);
    }, [showMenu]);

    return (
        <div className="node-image-uploader" ref={containerRef} onPointerDown={handlePointerDown as any}>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange as any}
                style={{ display: "none" }}
                aria-hidden
            />

            {/* Always show a small placeholder; preview is shown only inside the popover */}
            <div className="node-image-preview-label" onClick={openMenu as any}>
                <div className="node-image-placeholder">{preview ? "Image" : "Upload"}</div>
            </div>

            {showMenu && createPortal(
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }}>
                    <div
                        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
                        onClick={() => setShowMenu(false)}
                        onPointerDown={(e) => e.stopPropagation()}
                    />

                    <div
                        className="node-image-popover"
                        style={{ top: popoverPosition.y, left: popoverPosition.x }}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <div className="node-image-popover-photo-container">
                            {preview ? (
                                <img src={preview} className="node-image-popover-photo" alt="preview" />
                            ) : (
                                <div className="node-image-popover-placeholder">No image</div>
                            )}
                        </div>

                        <div className="node-image-popover-actions">
                            <button className="node-image-popover-button" onClick={handleUploadClick}>Load</button>
                            <button className="node-image-popover-button" onClick={handleDelete} disabled={!preview}>Remove</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ImageEditor;
