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

// --- Helpers ---
const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const vec3ToRgb = (v: number[]) => v.map(n => clamp(Math.round(n * 255), 0, 255));
const rgbToVec3 = (rgb: number[]) => rgb.map(n => Number((n / 255).toFixed(4))); // 4 decimal precision
const rgbToHex = (r: number, g: number, b: number) =>
    "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
};

const rgbToHsv = (r: number, g: number, b: number) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
};

const hsvToRgb = (h: number, s: number, v: number) => {
    h /= 360; s /= 100; v /= 100;
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
        default: r = 0; g = 0; b = 0;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

export const ColorEditor: FunctionalComponent<Props> = ({
    value,
    onChange,
    disabled = false,
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
    // Derived color state
    const [hexInput, setHexInput] = useState("#000000");
    const [rgbInput, setRgbInput] = useState<[string, string, string]>(["0", "0", "0"]);
    // HSV state for custom picker
    const [hsv, setHsv] = useState({ h: 0, s: 0, v: 0 });

    const svRef = useRef<HTMLDivElement>(null);
    const hueRef = useRef<HTMLDivElement>(null);

    // Sync from parent prop
    useEffect(() => {
        if (!showColorPicker) {
            const vec = Array.isArray(value) && value.length === 3 ? value : [0, 0, 0];
            const [r, g, b] = vec3ToRgb(vec);
            setHexInput(rgbToHex(r, g, b));
            setRgbInput([String(r), String(g), String(b)]);
            setHsv(rgbToHsv(r, g, b));
        }
    }, [value, showColorPicker]);

    const handleClick = (e: MouseEvent) => {
        e.stopPropagation();
        if (!disabled) {
            if (!showColorPicker) {
                // Calculate position
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setPopoverPosition({ x: rect.left, y: rect.bottom + 5 });

                // Sync HSV
                const [r, g, b] = hexToRgb(hexInput) || [0, 0, 0];
                setHsv(rgbToHsv(r, g, b));
            }
            setShowColorPicker(!showColorPicker);
        }
    };

    const handlePointerDown = (e: PointerEvent) => {
        e.stopPropagation();
    };

    const handleColorChange = (newHex: string, newRgbStr?: [string, string, string]) => {
        setHexInput(newHex);
        const rgb = hexToRgb(newHex);

        if (newRgbStr) setRgbInput(newRgbStr);
        else if (rgb) setRgbInput([String(rgb[0]), String(rgb[1]), String(rgb[2])]);

        if (rgb) setHsv(rgbToHsv(rgb[0], rgb[1], rgb[2]));

        if (rgb) {
            onChange(rgbToVec3(rgb));
        }
    };

    const handleHsvChange = (newHsv: { h: number, s: number, v: number }) => {
        setHsv(newHsv);
        const [r, g, b] = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
        const hex = rgbToHex(r, g, b);
        setHexInput(hex);
        setRgbInput([String(r), String(g), String(b)]);
        onChange(rgbToVec3([r, g, b]));
    };

    const handleSvDown = (e: PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const node = svRef.current;
        if (!node) return;

        const handleMove = (e: PointerEvent) => {
            const rect = node.getBoundingClientRect();
            const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
            const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);

            const s = x * 100;
            const v = (1 - y) * 100; // Inverted
            handleHsvChange({ ...hsv, s, v });
        };

        const handleUp = () => {
            window.removeEventListener("pointermove", handleMove);
            window.removeEventListener("pointerup", handleUp);
        };

        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", handleUp);

        handleMove(e);
    };

    const handleHueDown = (e: PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const node = hueRef.current;
        if (!node) return;

        const handleMove = (e: PointerEvent) => {
            const rect = node.getBoundingClientRect();
            const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
            const h = x * 360;
            handleHsvChange({ ...hsv, h });
        };

        const handleUp = () => {
            window.removeEventListener("pointermove", handleMove);
            window.removeEventListener("pointerup", handleUp);
        };

        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", handleUp);

        handleMove(e);
    };

    const handleRgbInputChange = (idx: number, valStr: string) => {
        const newRgbInput = [...rgbInput] as [string, string, string];
        newRgbInput[idx] = valStr;
        setRgbInput(newRgbInput);

        const r = parseInt(newRgbInput[0]) || 0;
        const g = parseInt(newRgbInput[1]) || 0;
        const b = parseInt(newRgbInput[2]) || 0;

        const rr = clamp(r, 0, 255);
        const gg = clamp(g, 0, 255);
        const bb = clamp(b, 0, 255);

        const hex = rgbToHex(rr, gg, bb);
        setHexInput(hex);
        setHsv(rgbToHsv(rr, gg, bb));
        onChange(rgbToVec3([rr, gg, bb]));
    };

    const [r, g, b] = hexToRgb(hexInput) || [0, 0, 0];
    const backgroundColor = `rgb(${r}, ${g}, ${b})`;

    return (
        <div className="node-color-container">
            <div
                className="node-color-swatch"
                style={{ backgroundColor }}
                onClick={handleClick as any}
                onPointerDown={handlePointerDown as any}
            >
                {hexInput}
            </div>

            {showColorPicker && createPortal(
                <div className="node-color-portal-container">
                    <div
                        className="node-color-backdrop"
                        onClick={() => setShowColorPicker(false)}
                        onPointerDown={(e) => e.stopPropagation()}
                    />
                    <div
                        className="node-color-popover"
                        style={{
                            top: popoverPosition.y,
                            left: popoverPosition.x
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Custom Color Picker */}
                        <div
                            className="node-picker-sv"
                            ref={svRef}
                            onPointerDown={handleSvDown as any}
                            style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
                        >
                            <div className="node-picker-sv-white" />
                            <div className="node-picker-sv-black" />
                            <div
                                className="node-picker-handle"
                                style={{
                                    left: `${hsv.s}%`,
                                    top: `${100 - hsv.v}%`
                                }}
                            />
                        </div>

                        <div
                            className="node-picker-hue"
                            ref={hueRef}
                            onPointerDown={handleHueDown as any}
                        >
                            <div
                                className="node-picker-handle"
                                style={{
                                    left: `${(hsv.h / 360) * 100}%`,
                                    top: '50%'
                                }}
                            />
                        </div>

                        {/* Hex Input */}
                        <div className="node-color-row">
                            <div className="node-color-label">Hex</div>
                            <input
                                className="node-color-input"
                                type="text"
                                value={hexInput}
                                onInput={(e) => handleColorChange((e.target as HTMLInputElement).value)}
                            />
                        </div>

                        {/* RGB Inputs */}
                        <div className="node-color-row">
                            <div className="node-color-label">R</div>
                            <input
                                className="node-color-input"
                                type="number"
                                min="0" max="255"
                                value={rgbInput[0]}
                                onInput={(e) => handleRgbInputChange(0, (e.target as HTMLInputElement).value)}
                            />
                        </div>
                        <div className="node-color-row">
                            <div className="node-color-label">G</div>
                            <input
                                className="node-color-input"
                                type="number"
                                min="0" max="255"
                                value={rgbInput[1]}
                                onInput={(e) => handleRgbInputChange(1, (e.target as HTMLInputElement).value)}
                            />
                        </div>
                        <div className="node-color-row">
                            <div className="node-color-label">B</div>
                            <input
                                className="node-color-input"
                                type="number"
                                min="0" max="255"
                                value={rgbInput[2]}
                                onInput={(e) => handleRgbInputChange(2, (e.target as HTMLInputElement).value)}
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
