import {
    AllowedUpdateType,
    InitializeAndSchematizeConfiguration,
    ProxyNode,
    SchemaBuilder,
} from '@fluid-experimental/tree2';

// Schema is defined using a builder object that generates a schema that is passed into the
// SharedTree data structure when it is intialized. The following code
// defines a set of types that are used to
// build the schema and, in the case of user-defined types, can be exported
// as TypeScript types to make it easier to write the app in a type-safe manner.

// Include a UUID to guarantee that this schema will be uniquely identifiable
const sb = new SchemaBuilder({ scope: 'fc1db2e8-0a00-11ee-be56-0242ac120002' });

// Define the schema for the note object. This schema includes an id to make
// building the React app simpler, several fields that use primitive types, and a sequence
// of user ids to track which users have voted on this note.
export const NoteSchema = sb.object('note', {
    id: sb.string,
    text: sb.string,
    author: sb.string,
    votes: sb.list(sb.string),
    created: sb.number,
    lastChanged: sb.number,        
});

// Schema for a list of Notes. This could be defined inline
// but it is convenient to define it as its own schema
// so that it can be used as a type in other parts of the app
export const NotesSchema = sb.list(NoteSchema);

// Define the schema for the container of notes. This type includes a sequence of notes.
export const GroupSchema = sb.object('pile', {
    id: sb.string,
    name: sb.string,
    notes: NotesSchema,
});

// Schema for a list of Notes and Groups. This could be defined inline
// but it is convenient to define it as its own schema
// so that it can be used as a type in other parts of the app
export const ItemsSchema = sb.list([GroupSchema, NoteSchema]);

// Define a root type.
export const AppSchema = sb.object('app', {
    items: ItemsSchema,
});

// Export the types defined here as TypeScript types.
export type App = ProxyNode<typeof AppSchema>;
export type Group = ProxyNode<typeof GroupSchema>;
export type Note = ProxyNode<typeof NoteSchema>;
export type Notes = ProxyNode<typeof NotesSchema>;
export type Items = ProxyNode<typeof ItemsSchema>;

// Export the tree config appropriate for this schema
// This is passed into the SharedTree when it is initialized
export const appSchemaConfig: InitializeAndSchematizeConfiguration = {
    schema: sb.intoSchema(AppSchema),
    initialTree: {
        items: [],
    },
    allowedSchemaModifications: AllowedUpdateType.SchemaCompatible,
};
