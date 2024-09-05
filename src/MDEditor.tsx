import { useState, useRef, useSyncExternalStore, createElement, useEffect } from 'react'
import './editor.css'
import {parseMarkdown, segmentMarkdownText} from "./markdown_helpers.ts"
import { produce } from 'immer'

import type { TextSelection } from './TextSelection.ts'
import {setTextSelection, getTextSelection, modifyTextSelection, collapseTextSelectionToStart, collapseTextSelectionToEnd, setTextSelectionPosition} from "./TextSelection.ts"
const h = createElement


function insertTextAtPos(originalString:string, textToInsert:string, position:number):string {
	// Ensure the position is within the bounds of the string
	if (position < 0) {
		position = 0;
	} else if (position > originalString.length) {
		position = originalString.length;
	}

	// Insert the text by slicing the original string and concatenating
	return originalString.slice(0, position) + textToInsert + originalString.slice(position);
}

function removeTextInRange(originalString: string, start: number, end: number): string {
    if (start >= end) {
        return originalString;
    }

    // Ensure start and end are within the bounds of the string
    start = Math.max(0, start);
    end = Math.min(originalString.length, end);

    // Return the string with the specified range removed
    return originalString.slice(0, start) + originalString.slice(end);
}

interface State{
	readonly source: string;
	readonly selection: TextSelection | null;
}



function MDEditor({value, onChange}:{value:string, onChange:(value: string)=>void}) {
	const editorDiv = useRef(null);
	// const [source, setSource] = useState<string>(`# My _markdown_ editor\n`+
	// 									`This is a **markdown** #richtext editor.\n`+
	// 									`support **strong**, _emphasis_, #tags and @mentions.\n`)
	// const [selection, setSelection] = useState<TextSelection|null>({start: 0, end: 0, direction:"forward"});

	const [state, setState] = useState<State>({
		source: sacksmd,
		selection: {start:0, end:0, direction:"forward"}
	});

	useEffect(()=>{
		if(editorDiv.current) {
			if(state.selection){
				setTextSelection(editorDiv.current, state.selection);
			}
		}
	}, [state]);
	
	useEffect(()=>{
		document.addEventListener("selectionchange", onSelectionChange);
	}, []);

	function onSelectionChange(e: any) {
		e.preventDefault();
		setState(state=>produce(state, draft=>{
			if(editorDiv.current)
				draft.selection = getTextSelection(editorDiv.current);
			return draft;
		}));
	}
	
	function onKeyDown(e:KeyboardEvent) {
		e.preventDefault();
		if(!state.selection){
			return;
		}

		if (e.key.length==1) {
			setState(state=>produce(state, draft=>{
				if (draft.selection) {
					if (draft.selection.start != draft.selection.end) {
						// delete selection
						draft.source = removeTextInRange(draft.source, draft.selection.start, draft.selection.end);
						draft.selection = {start: draft.selection.start, end: draft.selection.start, direction:"forward"};
					}

					// insert characters
					draft.source = insertTextAtPos(draft.source, e.key, draft.selection.end);
					draft.selection = setTextSelectionPosition(draft.selection.end+1, draft.selection);
				}
				return draft;
			}));
		}
		else if(e.key == "Enter"){
			setState(state=>produce(state, draft=>{
				if (draft.selection) {
					if (draft.selection.start != draft.selection.end) {
						// delete selection
						draft.source = removeTextInRange(draft.source, draft.selection.start, draft.selection.end);
						draft.selection = {start: draft.selection.start, end: draft.selection.start, direction:"forward"};
					}
					draft.source = insertTextAtPos(draft.source, "\n", draft.selection.end);
					draft.selection = setTextSelectionPosition(draft.selection.end+1, draft.selection);
				}
				return draft;
			}));
		}
		else if(e.key == "Backspace") {
			setState(state=>produce(state, draft=>{
				if (draft.selection) {
					if (draft.selection.end == draft.selection.start) {
						// delete backward
						draft.source = removeTextInRange(draft.source, draft.selection.start-1, draft.selection.end);
						draft.selection = {start: draft.selection.start-1, end: draft.selection.start-1, direction:"forward"};
					}
					else {
						// delete selection
						draft.source = removeTextInRange(draft.source, draft.selection.start, draft.selection.end);
						draft.selection = {start: draft.selection.start, end: draft.selection.start, direction:"forward"};
					}
				}
				return draft;			
			}));
		}
		else if(e.key == "Delete"){
			setState(state=>produce(state, draft=>{
				if (draft.selection) {
					if (draft.selection.end == draft.selection.start) {
						// delete forward
						draft.source = removeTextInRange(draft.source, draft.selection.start, draft.selection.end+1);
						draft.selection = {start: draft.selection.start, end: draft.selection.start, direction:"forward"};
					}
					else {
						// delete selection
						draft.source = removeTextInRange(draft.source, draft.selection.start, draft.selection.end);
						draft.selection = {start: draft.selection.start, end: draft.selection.start, direction:"forward"};
					}
				}
				return draft;			
			}));
		}

		else if (e.key == "ArrowLeft" && e.shiftKey) {
			setState(state=>produce(state, draft=>{
				if(draft.selection)
					draft.selection = modifyTextSelection("extend", "backward", "character", draft.selection);
				return draft;
			}));
		}
		else if (e.key == "ArrowLeft") {
			setState(state=>produce(state, draft=>{
				if(draft.selection) {
					if(draft.selection.start = draft.selection.end){
						draft.selection = modifyTextSelection("move", "backward", "character", draft.selection);
					}else{
						draft.selection = collapseTextSelectionToStart(draft.selection);
					}
				}
				return draft;
			}));
		}
		else if (e.key == "ArrowRight" && e.shiftKey) {
			setState(state=>produce(state, draft=>{
				if(draft.selection)
					draft.selection = modifyTextSelection("extend", "forward", "character", draft.selection);
				return draft;
			}));
		}
		else if (e.key == "ArrowRight") {
			setState(state=>produce(state, draft=>{
				if(draft.selection) {
					if(draft.selection.start = draft.selection.end){
						draft.selection = modifyTextSelection("move", "forward", "character", draft.selection);
					}else{
						draft.selection = collapseTextSelectionToEnd(draft.selection);
					}
				}
				return draft;
			}));
		}
		else if (e.key == "ArrowUp") {

		}
		else if (e.key == "ArrowDown") {

		}

		else{
			console.log(e.key)
		}
	};
	
	function onPaste(e:any) {
		e.preventDefault();
		if(state.selection) {
			const pastedText = e.clipboardData.getData('Text');
			setState(state=>produce(state, draft=>{
				if(draft.selection)
					draft.source = insertTextAtPos(draft.source, pastedText, draft.selection.end);
				return draft;
			}));
		}
	}
	
	function onDrop(e:any) {
		e.preventDefault();
	}
	
	function onSelectionHasChanged(e: any) {
		e.preventDefault();
	}
	
	return h("div",{},
		h("div",{
			id:"editor",
			ref: editorDiv,
			className:"editor",
			contentEditable:true,
			onKeyDown:onKeyDown,
			onPaste: onPaste,
			onSelect:onSelectionHasChanged,
			onDrop: onDrop,
			suppressContentEditableWarning: true
		},
			parseMarkdown(state.source).map(block=>{
				const children = block.content.map(segment=>{
					let textContent = segment.content;
					if(segment.type==="strong"){
						return h("strong", {}, textContent)
					}
					else if(segment.type==="emphasis"){
						return h("em", {}, textContent)
					}
					else if(segment.type==="tag"){
						return h("span", {className: "tag"}, textContent)
					}
					else if(segment.type==="mention"){
						return h("span", {className: "mention"}, textContent)
					}
					else if(segment.type==="text"){
						return textContent
					}
				})

				if (block.type==="h1") {
					return h("h1",{}, [...children]);
				}
				else if(block.type==="p") {
					return h("p", {}, [...children])
				}
			})
		),
		// h("textarea", {
		// 	id:"textarea", 
		// 	onInput: (e:any)=>setState(state=>produce(state, draft=>draft.source=e.target.value)),
		// 	value: state.source
		// })
	);
}

export default MDEditor;
