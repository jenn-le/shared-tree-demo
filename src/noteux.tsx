import React, { useEffect, useRef, useState } from 'react';
import { Note, Group, Notes, Items, NoteSchema, ItemsSchema } from './app_schema';
import {
    addNote,
    toggleVote,
    deleteNote,
    moveItem,
    updateNoteText,
} from './helpers';
import {
    dragType,
    getRotation,
    selectAction,
    testRemoteNoteSelection,
    updateRemoteNoteSelection,
} from './utils';
import { ConnectableElement, useDrag, useDrop } from 'react-dnd';
import { useTransition } from 'react-transition-state';
import { node } from '@fluid-experimental/tree2';
import { IconButton, MiniThumb, DeleteButton } from './buttonux';
import { Session } from './session_schema';

export function NoteContainer(props: {
    group: Group;
    clientId: string;
    selection: Note[];
    setSelection: any;
    session: Session;
    fluidMembers: string[];
}): JSX.Element {
    const notesArray = [];
    for (const n of props.group.notes) {
        notesArray.push(
            <NoteView
                key={n.id}
                note={n}
                clientId={props.clientId}
                notes={props.group.notes}
                selection={props.selection}
                setSelection={props.setSelection}
                session={props.session}
                fluidMembers={props.fluidMembers}
            />
        );
    }

    notesArray.push(
        <AddNoteButton key="newNote" group={props.group} clientId={props.clientId} />
    );

    return <div className="flex flex-row flex-wrap gap-8 p-2">{notesArray}</div>;
}

export function RootNoteWrapper(props: {
    note: Note;
    clientId: string;
    notes: Notes | Items;
    selection: Note[];
    setSelection: any;
    session: Session;
    fluidMembers: string[];
}): JSX.Element {
    return (
        <div className="bg-transparent flex flex-col justify-center h-64">
            <NoteView {...props} />
        </div>
    );
}

function NoteView(props: {
    note: Note;
    clientId: string;
    notes: Notes | Items;
    selection: Note[];
    setSelection: any;
    session: Session;
    fluidMembers: string[];
}): JSX.Element {
    const mounted = useRef(false);

    const [{ status }, toggle] = useTransition({
        timeout: 1000,
    });

    const [selected, setSelected] = useState(false);

    const [remoteSelected, setRemoteSelected] = useState(false);

    const [bgColor, setBgColor] = useState('bg-yellow-100');

    const [rotation] = useState(getRotation(props.note));

    const [invalidations, setInvalidations] = useState(0);

    const test = (message: string) => {
        console.log(
            message,
            'client id:',
            props.clientId,
            'item id:',
            props.note.id
        );
        testRemoteNoteSelection(
            props.note,
            props.session,
            props.clientId,
            setRemoteSelected,
            setSelected,
            props.fluidMembers
        );
    };

    const update = (action: selectAction) => {        
        updateRemoteNoteSelection(
            props.note,
            action,
            props.session,
            props.clientId,
            props.selection,
            props.setSelection
        );
    };

    // Register for tree deltas when the component mounts.
    // Any time the tree changes, the app will update
    // For more complex apps, this code can be included
    // on lower level components.
    useEffect(() => {
        // Returns the cleanup function to be invoked when the component unmounts.
        return node.on(props.session, 'afterChange', () => {
            test('invalidation');
            setInvalidations(invalidations + Math.random());
        });
    }, [invalidations]);
    
    useEffect(() => {
        test('fluid members');
    }, [props.fluidMembers])

    useEffect(() => {
        mounted.current = true;
        test('mounted');
        props.note.text = props.note.id;
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (selected) {
            setBgColor('bg-yellow-400');
        } else {
            setBgColor('bg-yellow-100');
        }
    }, [selected]);

    toggle(false);

    useEffect(() => {
        toggle(true);
    }, [node.parent(props.note)]);

    useEffect(() => {
        if (mounted.current) {
            toggle(true);
        }
    }, [props.note.text]);

    const [{ isDragging }, drag] = useDrag(() => ({
        type: dragType.NOTE,
        item: props.note,
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: [dragType.NOTE, dragType.GROUP],
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        }),
        canDrop: (item) => {
            if (node.is(item, NoteSchema)) return true;
            if (node.is(props.notes, ItemsSchema)) {
                return true;
            }
            return false;
        },
        drop: (item) => {
            const droppedNote = item as Note;
            moveItem(droppedNote, props.notes.indexOf(props.note), props.notes);
            return;
        },
    }));

    const attachRef = (el: ConnectableElement) => {
        drag(el);
        drop(el);
    };    

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (e.ctrlKey) {
            update(selectAction.MULTI);
        } else if (selected) {
            update(selectAction.REMOVE);
        } else {
            update(selectAction.SINGLE);
        }
    };

    return (
        <div
            onClick={(e) => handleClick(e)}
            className={`transition duration-500${
                status === 'exiting' ? ' transform ease-out scale-110' : ''
            }`}
        >
            <div
                ref={attachRef}
                className={
                    isOver && canDrop
                        ? 'border-l-4 border-dashed border-gray-500'
                        : 'border-l-4 border-dashed border-transparent'
                }
            >
                <div
                    style={{ opacity: isDragging ? 0.5 : 1 }}
                    className={
                        'relative transition-all flex flex-col ' +
                        bgColor +
                        ' h-48 w-48 shadow-md hover:shadow-lg hover:rotate-0 p-2 ' +
                        rotation +
                        ' ' +
                        (isOver && canDrop ? 'translate-x-3' : '')
                    }
                >
                    <NoteToolbar
                        note={props.note}
                        clientId={props.clientId}
                        notes={props.notes}
                    />
                    <NoteTextArea note={props.note} update={update} />
                    <NoteSelection show={remoteSelected} />
                </div>
            </div>
        </div>
    );
}

function NoteSelection(props: { show: boolean }): JSX.Element {
    if (props.show) {
        return (
            <div className="absolute -top-2 -left-2 h-52 w-52 rounded border-dashed border-indigo-800 border-4" />
        );
    } else {
        return <></>;
    }
}

function NoteTextArea(props: { note: Note; update: any }): JSX.Element {
    // The text field updates the Fluid data model on every keystroke in this demo.
    // This works well with small strings but doesn't scale to very large strings.
    // A Future iteration of SharedTree will include support for collaborative strings
    // that make real-time collaboration on this type of data efficient and simple.
    // If you need real-time typing before this happens, you can use the SharedString
    // data structure and embed that in a SharedTree using a Fluid Handle.

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (e.ctrlKey) {
            props.update(selectAction.MULTI);
        } else {
            props.update(selectAction.SINGLE);
        }
    };

    return (
        <textarea
            className="p-2 bg-transparent h-full w-full resize-none z-50"
            value={props.note.text}
            onClick={(e) => handleClick(e)}
            onChange={(e) => updateNoteText(props.note, e.target.value)}
        />
    );
}

function NoteToolbar(props: {
    note: Note;
    clientId: string;
    notes: Notes | Items;
}): JSX.Element {
    return (
        <div className="flex justify-between z-50">
            <LikeButton note={props.note} clientId={props.clientId} />
            <DeleteNoteButton note={props.note} notes={props.notes} />
        </div>
    );
}

function AddNoteButton(props: { group: Group; clientId: string }): JSX.Element {
    const [{ isActive }, drop] = useDrop(() => ({
        accept: dragType.NOTE,
        collect: (monitor) => ({
            isActive: monitor.canDrop() && monitor.isOver(),
        }),
        drop: (item) => {
            const droppedNote = item as Note;
            const i = node.key(droppedNote) as number;
            props.group.notes.moveToEnd(i, node.parent(droppedNote) as Notes);
            return;
        },
    }));

    let size = 'h-48 w-48';
    let buttonText = 'Add Note';
    if (props.group.notes.length > 0) {
        buttonText = '+';
        size = 'h-48';
    }

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        addNote(props.group.notes, '', props.clientId);
    };

    return (
        <div
            ref={drop}
            className={
                isActive
                    ? 'border-l-4 border-dashed border-gray-500'
                    : 'border-l-4 border-dashed border-transparent'
            }
        >
            <div
                className={
                    'transition-all text-2xl place-content-center font-bold flex flex-col text-center cursor-pointer bg-transparent border-white border-dashed border-8 ' +
                    size +
                    ' p-4 hover:border-black' +
                    ' ' +
                    (isActive ? 'translate-x-3' : '')
                }
                onClick={(e) => handleClick(e)}
            >
                {buttonText}
            </div>
        </div>
    );
}

function LikeButton(props: { note: Note; clientId: string }): JSX.Element {
    const setColor = () => {
        if (props.note.votes.indexOf(props.clientId) > -1) {
            return 'text-white';
        } else {
            return undefined;
        }
    };

    const setBackground = () => {
        if (props.note.votes.indexOf(props.clientId) > -1) {
            return 'bg-green-600';
        } else {
            return undefined;
        }
    };

    return (
        <div className="relative flex z-50">
            <IconButton
                color={setColor()}
                background={setBackground()}
                handleClick={() => toggleVote(props.note, props.clientId)}
                icon={MiniThumb()}
            >
                {props.note.votes.length}
            </IconButton>
        </div>
    );
}

function DeleteNoteButton(props: { note: Note; notes: Notes | Items }): JSX.Element {
    return <DeleteButton handleClick={() => deleteNote(props.note)}></DeleteButton>;
}
