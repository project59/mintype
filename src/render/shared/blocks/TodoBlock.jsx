import React, { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Circle, CheckCircle, ChevronRight, ChevronDown } from "lucide-react";
import { useUndoRedo } from "../../../layouts/page/HistroyContext";
import { useDrag, useDrop } from "react-dnd";
import { nanoid } from "nanoid";
import TextareaAutosize from 'react-textarea-autosize';
import { Button, Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { useSidebar } from "../../../layouts/root/SidebarContext";

const ITEM_TYPE = "TODO_ITEM";

const defaultTodo = (parentId = null, order = 0) => ({
    id: nanoid(),
    title: "",
    description: "",
    date: "",
    priority: "none",
    completed: false,
    parentId,
    order,
});

const TodoItem = ({ todo, allTodos, onUpdate, onDelete, onMove, depth = 0, isCompleted = false }) => {
    const ref = useRef(null);
    const [{ isDragging }, drag, preview] = useDrag({
        type: ITEM_TYPE,
        canDrag: () => !isOpen && !isCompleted,
        item: { id: todo.id, depth },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [{ isOver, dropPosition }, drop] = useDrop({
        accept: ITEM_TYPE,
        hover(item, monitor) {
            if (!ref.current || item.id === todo.id) return;
            const rect = ref.current.getBoundingClientRect();
            const offset = monitor.getClientOffset();
            const hoverY = offset.y - rect.top;
            let position = "inside";
            if (hoverY < 12) {
                position = "above";
            }
            item.previewPosition = position;
            item.targetId = todo.id;
        },
        drop(item, monitor) {
            if (!monitor.didDrop()) {
                const position = item.previewPosition || "inside";
                if (item.id === todo.id) return;
                if (position === "inside") {
                    onMove(item.id, todo.id, null);
                } else if (position === "above") {
                    onMove(item.id, todo.parentId, todo.id);
                }
            }
        },
        collect: (monitor) => ({
            isOver: monitor.isOver({ shallow: true }),
            dropPosition: monitor.getItem()?.previewPosition || null,
        }),
    });

    // Attach drag only to the handle
    drag(ref);
    drop(ref);
    preview(ref);

    const toggleComplete = () => {
        onUpdate({ ...todo, completed: !todo.completed });
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    };

    const updateField = (field, value) => {
        onUpdate({ ...todo, [field]: value });
    };

    const addChild = (e) => {
        e.stopPropagation();
        const childrenCount = allTodos.filter((t) => t.parentId === todo.id).length;
        const newChild = defaultTodo(todo.id, childrenCount);
        onUpdate(newChild, true);
    };

    const priorityColor = (priority) => {
        switch (priority) {
            case "low":
                return "text-green-500 border-green-500/50 bg-green-400/10";
            case "medium":
                return "text-yellow-600 border-yellow-500/50 bg-yellow-400/10";
            case "high":
                return "text-red-400 border-red-500/50 bg-red-400/10";
            default:
                return "text-gray-400 border-gray-500/50 bg-gray-400/10";
        }
    };

    const children = allTodos
        .filter((t) => t.parentId === todo.id)
        .sort((a, b) => a.order - b.order);

    const [isOpen, setIsOpen] = useState(false);
    const { setAllowDragSelect } = useSidebar();

    function open() {
        setIsOpen(true);
        setAllowDragSelect(false);
    }

    function close() {
        setIsOpen(false);
        setAllowDragSelect(true);
    }

    const [, forceUpdate] = useState({});
    useEffect(() => {
        if (isOpen) {
            // Force a re-render after dialog is open
            setTimeout(() => {
                forceUpdate({});
            }, 0);
        }
    }, [isOpen]);

    return (
        <>
            <div
                ref={ref}
                className={`
                    relative py-1.5 rounded-md transition-all duration-150 group/todo
                    ${isDragging ? "px-2 opacity-60 bg-blue-100 dark:bg-blue-500/20  shadow-md scale-[1.02]" : ""}
                    ${isOver && !isCompleted ? "bg-blue-50 dark:bg-blue-500/10 px-2" : ""}
                `}
                style={{ marginLeft: `${depth * 24}px` }}
            >
                {isOver && dropPosition === "above" && !isCompleted && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500">
                        <ChevronRight className="absolute -top-2 -left-3 text-blue-500" size={16} />
                    </div>
                )}
                <div className="flex items-start gap-1.5">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleComplete();
                        }}
                        className="mt-[3px]"
                    >
                        {todo.completed ? (
                            <CheckCircle className="text-blue-600" size={16} />
                        ) : (
                            <Circle className="text-gray-400 hover:text-blue-500" size={16} />
                        )}
                    </button>
                    <>
                        <Button
                            onClick={open}
                            className={`text-left w-full min-h-5`}
                        >
                            <div className="flex justify-between">
                                <div className="flex flex-col gap-1">
                                    <p
                                        className={`dark:text-gray-200 text-sm ${todo.completed
                                                ? "line-through text-gray-400 dark:text-gray-600"
                                                : "text-gray-900"
                                            }`}
                                    >
                                        <span className="whitespace-pre-wrap">{todo.title || 'New task'}</span>
                                    </p>
                                    {todo.description && (
                                        <span className={`whitespace-pre-wrap text-sm ${todo.completed
                                                ? "line-through text-gray-300 dark:text-gray-700"
                                                : "text-gray-400"
                                            }`} >{todo.description}</span>
                                    )}
                                    {(todo.date || todo.priority !== "none") && (
                                        <p className="text-xs text-gray-400 mt-1 flex gap-1">
                                            {todo.date && (
                                                <span className="px-2 py-0.5 rounded-full border text-indigo-400 border-indigo-500/50 bg-ingido-50">
                                                    {todo.date}
                                                </span>
                                            )}
                                            {todo.priority !== "none" && (
                                                <span
                                                    className={`px-2 py-0.5 rounded-full border capitalize ${priorityColor(
                                                        todo.priority
                                                    )}`}
                                                >
                                                    {todo.priority}
                                                </span>
                                            )}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Button>
                        <Dialog open={isOpen} className="relative z-20 focus:outline-none" onClose={close}>
                            <DialogBackdrop transition className="dialogBackdrop" />
                            <div className="dialogWrapper">
                                <DialogPanel
                                    transition
                                    className="dialogPanel !z-50 !max-w-lg"
                                >
                                    <TextareaAutosize
                                        type="text"
                                        placeholder="Todo title"
                                        value={todo.title}
                                        onChange={(e) => updateField("title", e.target.value)}
                                        className={`w-full font-medium text-base resize-none bg-transparent focus:outline-none focus:border-blue-400 ${todo.completed ? "line-through text-gray-400" : "dark:text-white text-gray-900"
                                            }`}
                                    />
                                    <TextareaAutosize
                                        type="text"
                                        placeholder="Description..."
                                        value={todo.description}
                                        onChange={(e) => updateField("description", e.target.value)}
                                        className={`w-full resize-none bg-transparent text-sm focus:outline-none focus:border-blue-400 ${todo.completed ? "line-through text-gray-300" : "text-gray-600 dark:text-gray-400"
                                            }`}
                                    />
                                    <div className="flex flex-wrap gap-1 mt-1 items-center text-xs">
                                        <input
                                            type="date"
                                            value={todo.date}
                                            onChange={(e) => updateField("date", e.target.value)}
                                            className="btnChip !text-black dark:!text-white"
                                        />
                                        <select
                                            value={todo.priority}
                                            onChange={(e) => updateField("priority", e.target.value)}
                                            className="btnChip h-6"
                                        >
                                            <option value="none">None</option>
                                            <option value="high">High</option>
                                            <option value="medium">Medium</option>
                                            <option value="low">Low</option>
                                        </select>
                                        <div className="gap-1 flex">
                                            <button onClick={addChild} className="btnChip h-fit !gap-1">
                                                <Plus size={12} />
                                            </button>
                                            <button onClick={() => onDelete(todo.id)} className="btnChip h-fit">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </DialogPanel>
                            </div>
                        </Dialog>
                    </>
                </div>
            </div>
            {!isCompleted && children.map((child) => (
                <TodoItem
                    key={child.id}
                    todo={child}
                    allTodos={allTodos}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onMove={onMove}
                    depth={depth + 1}
                />
            ))}
        </>
    );
};

const TodoBlock = ({ data, onUpdate }) => {
    console.warn("TodoBlock render");
    const { undoRedoTrigger } = useUndoRedo();
    const [project, setProject] = useState({
        title: "",
        description: "",
        todos: [],
        ...data,
    });
    const [showCompleted, setShowCompleted] = useState(false);

    useEffect(() => {
        if (data.todos) {
            setProject(data);
        }
    }, [undoRedoTrigger]);

    const updateProjectField = (field, value) => {
        const updated = { ...project, [field]: value };
        setProject(updated);
        onUpdate(updated);
    };

    const addTodo = () => {
        const topLevelTodos = project.todos.filter(t => t.parentId === null);
        const newOrder = topLevelTodos.length;
        updateProjectField("todos", [...project.todos, defaultTodo(null, newOrder)]);
    };

    const updateTodo = (updatedTodo, isNew = false) => {
        if (isNew) {
            updateProjectField("todos", [...project.todos, updatedTodo]);
        } else {
            const newTodos = project.todos.map((t) => (t.id === updatedTodo.id ? updatedTodo : t));
            updateProjectField("todos", newTodos);
        }
    };

    const deleteTodo = (id) => {
        // Simply delete the specific todo item, not its children or parent
        const newTodos = project.todos.filter((t) => t.id !== id);
        updateProjectField("todos", newTodos);
    };

    const moveTodo = (draggedId, newParentId, insertBeforeId) => {
        const draggedTodo = project.todos.find(t => t.id === draggedId);
        if (!draggedTodo) return;

        // Prevent dropping into own descendants
        const getAllDescendants = (parentId) => {
            const children = project.todos.filter(t => t.parentId === parentId);
            return children.reduce((acc, child) => {
                return [...acc, child.id, ...getAllDescendants(child.id)];
            }, []);
        };

        const descendants = getAllDescendants(draggedId);
        if (newParentId && descendants.includes(newParentId)) return;

        let newTodos = [...project.todos];
        const siblings = newTodos
            .filter(t => t.parentId === newParentId)
            .sort((a, b) => a.order - b.order);

        let newOrder;
        if (insertBeforeId === null) {
            // Insert at end
            newOrder = siblings.length;
        } else {
            const insertBefore = siblings.find(t => t.id === insertBeforeId);
            newOrder = insertBefore ? insertBefore.order : siblings.length;
        }

        // Update the dragged item
        newTodos = newTodos.map(t => {
            if (t.id === draggedId) {
                return { ...t, parentId: newParentId, order: newOrder };
            }
            // Reorder siblings
            if (t.parentId === newParentId && t.id !== draggedId) {
                if (t.order >= newOrder) {
                    return { ...t, order: t.order + 1 };
                }
            }
            return t;
        });

        updateProjectField("todos", newTodos);
    };

    const topLevelTodos = project.todos
        .filter(t => t.parentId === null && !t.completed)
        .sort((a, b) => a.order - b.order);

    const completedTodos = project.todos
        .filter(t => t.parentId === null && t.completed)
        .sort((a, b) => a.order - b.order);

    return (
        <div className="w-full flex flex-col ql-font-Inter mb-2">
            <input
                type="text"
                placeholder="Group Title..."
                value={project.title}
                onChange={(e) => updateProjectField("title", e.target.value)}
                className="w-full text-lg font-semibold bg-transparent text-black dark:text-white focus:outline-none focus:border-blue-400 h-8"
            />
            <div className="">
                {topLevelTodos.map((todo) => (
                    <TodoItem
                        key={todo.id}
                        todo={todo}
                        allTodos={project.todos}
                        onUpdate={updateTodo}
                        onDelete={deleteTodo}
                        onMove={moveTodo}
                        depth={0}
                    />
                ))}
            </div>
            <button onClick={addTodo} className="btnChip flex items-center gap-1 w-fit mt-2">
                Add Task <Plus size={12} />
            </button>

            {completedTodos.length > 0 && (
                <div className="mt-4 border-t border-gray-200 dark:border-slate-500/20 pt-2">
                    <button
                        onClick={() => setShowCompleted(!showCompleted)}
                        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                        {showCompleted ? (
                            <ChevronDown size={16} />
                        ) : (
                            <ChevronRight size={16} />
                        )}
                        <span>Completed ({completedTodos.length})</span>
                    </button>
                    {showCompleted && (
                        <div className="mt-2 opacity-60">
                            {completedTodos.map((todo) => (
                                <TodoItem
                                    key={todo.id}
                                    todo={todo}
                                    allTodos={project.todos}
                                    onUpdate={updateTodo}
                                    onDelete={deleteTodo}
                                    onMove={moveTodo}
                                    depth={0}
                                    isCompleted={true}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

TodoBlock.displayName = "TodoBlock";
export default TodoBlock;