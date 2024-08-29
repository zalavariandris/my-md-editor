import {produce} from "immer";
import _ from "lodash"


let document = {
    source: `# My markdown Editor
This is a **markdown** #richtext editor.
support **strong**, _emphasis_, #tags and @mentions`,
    
    selection: {
        anchorNode: "ID2",
        anchorOffset: 0,
        focusNode: "ID1",
        focusOffset: 0,
        ranges: [

        ]
    }
};

let listeners = [];

function emitChange() {
    for (let listener of listeners) {
        listener();
    }
};

export default {
    subscribe(listener) 
    {
        listeners = [...listeners, listener];
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    },

    getSnapshot() {
        return document;
    }
}