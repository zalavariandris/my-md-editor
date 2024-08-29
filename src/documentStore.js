import {produce} from "immer";
import _ from "lodash"


let document = {
    source: `# My
This is a **markdown** #richtext editor.
support **strong**, _emphasis_, #tags and @mentions.`,
    
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
    insertTextAt(text, pos){
        console.log(`insert text at: ${text}, ${pos}`)
        const nextDocument = produce(document, draft=>{
            draft.source = [document.source.slice(0, pos), text, document.source.slice(pos)].join('');
        });
        document = nextDocument;
        emitChange()
    },

    removeTextInRange(range){

    },
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