import { h } from "preact";
import type { FunctionalComponent } from "preact";
import "../VariableEditor.css";

type Props = {
    value: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
};

export const BooleanEditor: FunctionalComponent<Props> = ({
    value,
    onChange,
    disabled = false,
}) => {
    const toggle = (e: MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        onChange(!value);
    };

    const handlePointerDown = (e: PointerEvent) => {
        e.stopPropagation();
    };

    return (
        <div className="node-variable-editor-boolean" onPointerDown={handlePointerDown as any}>
            <div
                className={`node-boolean-pill ${value ? 'active' : ''}`}
                onClick={toggle as any}
                title={value ? "True (Click to toggle)" : "False (Click to toggle)"}
            >
                <div className="node-boolean-switch" />
                <span className="node-boolean-text">{value ? 'TRUE' : 'FALSE'}</span>
            </div>
        </div>
    );
};
