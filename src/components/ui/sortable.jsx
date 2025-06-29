"use client";;
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable as useDndSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import * as PortalPrimitive from "@radix-ui/react-portal";
import { Primitive } from "@radix-ui/react-primitive";
import * as React from "react";

import { cn } from "@/lib/utils";

const SortableImplContext = React.createContext({
  activeId: null,
  getTransformStyle: CSS.Transform.toString,
});

function useSortable() {
  const context = React.useContext(SortableImplContext);
  if (!context) {
    throw new Error("useSortable must be used within a <Sortable />.");
  }

  return context;
}

function Sortable({
  onDragStart,
  onDragEnd,
  onDragCancel,
  getNewIndex,
  collisionDetection = closestCenter,
  getTransformStyle = CSS.Transform.toString,
  ...props
}) {
  const [activeId, setActiveId] = React.useState(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  }));

  return (
    <SortableImplContext.Provider
      value={{
        activeId,
        getTransformStyle,
        getNewIndex,
      }}>
      <DndContext
        data-slot="sortable"
        onDragStart={composeEventHandlers(onDragStart, ({ active }) => setActiveId(active.id))}
        onDragEnd={composeEventHandlers(onDragEnd, () => setActiveId(null))}
        onDragCancel={composeEventHandlers(onDragCancel, () => setActiveId(null))}
        collisionDetection={collisionDetection}
        sensors={sensors}
        {...props} />
    </SortableImplContext.Provider>
  );
}

function SortableList({
  orientation = "vertical",

  strategy = orientation === "vertical"
    ? verticalListSortingStrategy
    : horizontalListSortingStrategy,

  items,
  disabled,
  id,
  ref,
  ...props
}) {
  return (
    <SortableContext strategy={strategy} items={items} disabled={disabled} id={id}>
      <Primitive.ul
        data-slot="sortable-list"
        ref={ref}
        data-orientation={orientation}
        {...props} />
    </SortableContext>
  );
}

function SortableGrid({
  strategy,
  items,
  disabled,
  id,
  ref,
  ...props
}) {
  return (
    <SortableContext strategy={strategy} items={items} disabled={disabled} id={id}>
      <Primitive.div data-slot="sortable-grid" ref={ref} {...props} />
    </SortableContext>
  );
}

const SortableItemContext = React.createContext({
  id: "",
  disabled: false,
});

function useSortableItem() {
  const context = React.useContext(SortableItemContext);
  if (!context) {
    throw new Error("useSortableItem must be used within a <SortableItem />.");
  }

  return context;
}

function SortableItem({
  id,
  disabled,
  style: styleProp,
  ref,
  ...props
}) {
  const { getTransformStyle, getNewIndex } = useSortable();
  const {
    attributes,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    isSorting,
  } = useDndSortable({
    id,
    disabled,
    getNewIndex,
  });

  const composedRefs = useComposedRefs(setNodeRef, ref);
  const style = {
    transform: getTransformStyle(transform),
    transition,
    ...styleProp,
  };

  return (
    <SortableItemContext.Provider value={{ id, disabled }}>
      <Primitive.div
        data-slot="sortable-item"
        ref={composedRefs}
        style={style}
        data-dragging={isDragging || undefined}
        data-over={isOver || undefined}
        data-sorting={isSorting || undefined}
        {...attributes}
        {...props} />
    </SortableItemContext.Provider>
  );
}

function SortableItemTrigger({
  className,
  disabled: disabledProp,
  ref,
  ...props
}) {
  const { getNewIndex } = useSortable();
  const { id, disabled } = useSortableItem();
  const { listeners, setActivatorNodeRef, isDragging, isOver, isSorting } =
    useDndSortable({
      id,
      disabled: disabledProp || disabled,
      getNewIndex,
    });

  const composedRefs = useComposedRefs(setActivatorNodeRef, ref);

  return (
    <Primitive.button
      data-slot="sortable-item-trigger"
      ref={composedRefs}
      data-dragging={isDragging || undefined}
      data-over={isOver || undefined}
      data-sorting={isSorting || undefined}
      disabled={disabledProp}
      className={cn("touch-none", className)}
      {...listeners}
      {...props} />
  );
}

function SortableOverlay({
  children,
  ...props
}) {
  const { activeId } = useSortable();

  return (
    <PortalPrimitive.Root>
      <DragOverlay data-slot="sortable-overlay" {...props}>
        {activeId &&
          (typeof children === "function" ? children(activeId) : children)}
      </DragOverlay>
    </PortalPrimitive.Root>
  );
}

export {
  Sortable,
  SortableList,
  SortableGrid,
  SortableItem,
  SortableItemTrigger,
  SortableOverlay,
};
