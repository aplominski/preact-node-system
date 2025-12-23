import { h } from "preact";
import type { FunctionalComponent } from "preact";
// css already imported above
import { NumberEditor } from "./editors/NumberEditor";
import { Vec2Editor } from "./editors/Vec2Editor";
import { Vec3Editor } from "./editors/Vec3Editor";
import { ColorEditor } from "./editors/ColorEditor";
import { ImageEditor } from "./editors/ImageEditor";
import { StringEditor } from "./editors/StringEditor";
import { BooleanEditor } from "./editors/BooleanEditor";
import "./VariableEditor.css";

type Props = {
    type?: string;
    value: any;
    onChange: (value: any) => void;
    disabled?: boolean;
};

export const VariableEditor: FunctionalComponent<Props> = ({
    type,
    value,
    onChange,
    disabled = false,
}) => {
    if (disabled) {
        // If this is a string and disabled (e.g. preview on node outputs),
        // render a compact single-line preview showing only the beginning + "..."
        if (type === 'string') {
            const preview = (v: any) => {
                if (v === null || v === undefined) return '';
                const s = String(v).replace(/\r?\n/g, ' ');
                const max = 12;
                return s.length > max ? s.slice(0, max - 1) + '…' : s;
            };
            return (
                <div className="node-variable-editor-pill node-variable-editor-string-preview" title={String(value ?? '')}>
                    <span className="node-variable-editor-string-text">{preview(value)}</span>
                </div>
            );
        }

        // Render a simple read-only representation when disabled for other types
        const format = (v: any) => {
            if (v === null || v === undefined) return String(v);
            if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
            if (typeof v === 'string') return v;
            try {
                return typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v);
            } catch (e) {
                return String(v);
            }
        };

        return <div className="node-variable-readonly">{format(value)}</div>;
    }

    switch (type) {
        case "number":
            return <NumberEditor value={value} onChange={onChange} disabled={disabled} />;
        case "Vec2":
            return <Vec2Editor value={value} onChange={onChange} disabled={disabled} />;
        case "Vec3":
            return <Vec3Editor value={value} onChange={onChange} disabled={disabled} />;
        case "color":
            return <ColorEditor value={value} onChange={onChange} disabled={disabled} />;
        case "image":
            return <ImageEditor value={value} onChange={onChange} disabled={disabled} />;
        case "string":
            return <StringEditor value={value} onChange={onChange} disabled={disabled} />;
        case "boolean":
            return <BooleanEditor value={!!value} onChange={onChange} disabled={disabled} />;
        default:
            return null;
    }
};

export default VariableEditor;
