import { h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { FunctionalComponent } from "preact";
import type { NodeTypeDef } from "../Node/node.ts";
import "./BlockMenu.css";

type Props = {
  nodeTypes: Record<string, NodeTypeDef>;
  position: { x: number; y: number };
  onSelect: (nodeTypeId: string) => void;
  onClose: () => void;
};

export const BlockMenu: FunctionalComponent<Props> = ({
  nodeTypes,
  position,
  onSelect,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Group node types by category. Keep uncategorized nodes separate so they
  // appear in the main menu below categories instead of as a separate category.
  const uncategorized: NodeTypeDef[] = [];
  const groupedByCategory = Object.values(nodeTypes).reduce((acc, nodeType) => {
    const category = nodeType.category;
    if (!category) {
      uncategorized.push(nodeType);
      return acc;
    }
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(nodeType);
    return acc;
  }, {} as Record<string, NodeTypeDef[]>);

  // Get all categories sorted
  const sortedCategories = Object.keys(groupedByCategory).sort();

  // Sort nodes within each category by title/id
  sortedCategories.forEach((category) => {
    groupedByCategory[category].sort((a, b) => {
      const titleA = a.title || a.id;
      const titleB = b.title || b.id;
      return titleA.localeCompare(titleB);
    });
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedCategory) {
          setSelectedCategory(null);
        } else {
          handleClose();
        }
      }
    };

    // Use a pointerdown listener for outside-click detection instead of
    // high-frequency mousemove + getBoundingClientRect (which forces layout
    // on every event and causes jank).
    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current) {
        const target = e.target as Node | null;
        if (!target || !menuRef.current.contains(target)) {
          handleClose();
        }
      }
    };

    // Add listeners after a small delay to avoid immediate close when menu opens
    // Also attach a pointermove listener to detect when the pointer is
    // outside the menu and stays there for >500ms.
    const handlePointerMove = (e: PointerEvent) => {
      if (!menuRef.current) return;
      const target = e.target as Node | null;
      const isOver = !!target && menuRef.current.contains(target);
      if (isOver) {
        cancelScheduledClose();
      } else {
        // Only schedule if not already scheduled
        if (!closeTimeoutRef.current) {
          scheduleClose(500);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("pointerdown", handlePointerDown);
      document.addEventListener("pointermove", handlePointerMove);

      // Schedule auto-close after a delay, but skip scheduling if the
      // pointer is already over the menu (matches(':hover') covers the
      // case where the pointer started inside the menu and no
      // pointerenter event will fire).
      try {
        if (!menuRef.current || !menuRef.current.matches(":hover")) {
          scheduleClose(500);
        }
      } catch (err) {
        // matches could throw in very old browsers; fall back to scheduling
        scheduleClose(500);
      }
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointermove", handlePointerMove);
    };
  }, [selectedCategory]);

  const handleSelect = (nodeTypeId: string) => {
    cancelScheduledClose();
    onSelect(nodeTypeId);
    handleClose();
  };

  const handleCategorySelect = (category: string) => {
    // Cancel any scheduled close when navigating into a category so
    // the submenu doesn't auto-close while the user interacts with it.
    cancelScheduledClose();
    setSelectedCategory(category);
  };

  const handleBack = () => {
    setSelectedCategory(null);
  };

  // Debounced close when pointer leaves the menu to avoid immediate flicker
  // but still close when the user moves the cursor away.
  const closeTimeoutRef = useRef<number | null>(null);

  const cancelScheduledClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    // Wait for closing animation to complete before calling onClose
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const scheduleClose = (delay = 150) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = window.setTimeout(() => {
      closeTimeoutRef.current = null;
      handleClose();
    }, delay);
  };

  // If a category is selected, show blocks in that category
  if (selectedCategory) {
    const blocks = groupedByCategory[selectedCategory] || [];
    return (
      <div
        ref={menuRef}
        className={`node-block-menu ${isClosing ? "node-block-menu-closing" : ""}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onPointerEnter={cancelScheduledClose}
        onPointerDown={cancelScheduledClose}
        onWheel={cancelScheduledClose}
        onScroll={cancelScheduledClose}
      >
        <div className="node-block-menu-back">
          <button
            className="node-block-menu-back-button"
            onClick={handleBack}
            onMouseDown={(e) => e.preventDefault()}
          >
            ← Back
          </button>
          <div className="node-block-menu-category-header">{selectedCategory}</div>
        </div>
        <div className="node-block-menu-category-items">
          {blocks.map((nodeType) => (
            <div
              key={nodeType.id}
              className="node-block-menu-item"
              onClick={() => handleSelect(nodeType.id)}
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="node-block-menu-item-title">
                {nodeType.title || nodeType.id}
              </div>
              {nodeType.color && (
                <div
                  className="node-block-menu-item-color"
                  style={{ backgroundColor: nodeType.color }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show categories
  return (
    <div
      ref={menuRef}
      className={`node-block-menu ${isClosing ? "node-block-menu-closing" : ""}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onPointerEnter={cancelScheduledClose}
      onPointerDown={cancelScheduledClose}
      onWheel={cancelScheduledClose}
      onScroll={cancelScheduledClose}
    >
      {sortedCategories.map((category) => (
        <div
          key={category}
          className="node-block-menu-item"
          onClick={() => handleCategorySelect(category)}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="node-block-menu-item-title">{category}</div>
          <div className="node-block-menu-item-arrow">→</div>
        </div>
      ))}

      {uncategorized.length > 0 && (
        <div className="node-block-menu-category">
          <div className="node-block-menu-category-items">
            {uncategorized.map((nodeType) => (
              <div
                key={nodeType.id}
                className="node-block-menu-item"
                onClick={() => handleSelect(nodeType.id)}
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="node-block-menu-item-title">{nodeType.title || nodeType.id}</div>
                {nodeType.color && (
                  <div
                    className="node-block-menu-item-color"
                    style={{ backgroundColor: nodeType.color }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockMenu;
