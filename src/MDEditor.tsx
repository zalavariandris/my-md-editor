import { useState, useRef, useSyncExternalStore, createElement, useEffect } from 'react'
import './editor.css'
import {parseMarkdown, segmentMarkdownText} from "./markdown_helpers.ts"
import { current } from 'immer'

import type { TextSelection } from './TextSelection.ts'
import {setTextSelection, getTextSelection, modifyTextSelection, collapseTextSelectionToStart, collapseTextSelectionToEnd} from "./TextSelection.ts"
const h = createElement


function insertTextAtPos(originalString:string, textToInsert:string, position:number) {
	// Ensure the position is within the bounds of the string
	if (position < 0) {
		position = 0;
	} else if (position > originalString.length) {
		position = originalString.length;
	}

	// Insert the text by slicing the original string and concatenating
	return originalString.slice(0, position) + textToInsert + originalString.slice(position);
}


function MDEditor() {
	const editorDiv = useRef(null);
	const [source, setSource] = useState<string>(`# My _markdown_ editor\n`+
										`This is a **markdown** #richtext editor.\n`+
										`support **strong**, _emphasis_, #tags and @mentions.\n`)
	const [selection, setSelection] = useState<TextSelection|null>({start: 0, end: 0, direction:"forward"});
	
	useEffect(()=>{
		if(editorDiv.current) {
			if(selection){
				setTextSelection(editorDiv.current, selection);
			}
		}
	}, [selection]);
	
	useEffect(()=>{
		document.addEventListener("selectionchange", onSelectionChange);
	}, []);

	function onSelectionChange(e: any) {
		e.preventDefault();
		if(editorDiv.current){
			setSelection(getTextSelection(editorDiv.current));
		}
	}
	
	function onKeyDown(e:KeyboardEvent) {
		e.preventDefault();
		if(!selection){
			return;
		}


		if (e.key.length==1) {

		}
		else if (e.key == "ArrowLeft" && e.shiftKey) {
			setSelection(sel=>sel?modifyTextSelection("extend", "backward", "character", sel):sel);
		}
		else if (e.key == "ArrowLeft") {
			setSelection(sel=>{
				if(!sel)
					return sel;
				if(sel.start==sel.end)
					return modifyTextSelection("move", "backward", "character", sel)
				else
					return collapseTextSelectionToStart(sel);
			});
		}
		else if (e.key == "ArrowRight" && e.shiftKey) {
			setSelection(sel=>sel?modifyTextSelection("extend", "forward", "character", sel):sel);
		}
		else if (e.key == "ArrowRight") {
			setSelection(sel=>{
				if(!sel)
					return sel;
				if(sel.start==sel.end)
					return modifyTextSelection("move", "forward", "character", sel)
				else
					return collapseTextSelectionToEnd(sel);
			});
		}
		else if (e.key == "ArrowUp") {

		}
		else if (e.key == "ArrowDown") {

		}
	};
	
	function onPaste(e:any) {
		e.preventDefault();
	}
	
	function onDrop(e:any) {
		e.preventDefault();
	}
	
	function onSelectionHasChanged(e: any) {
		e.preventDefault();
	}
	
	return h("div",{},
		h("div", {},
			h("div", {},
				"selection range",
				h("input", {
					type:"number", 
					value:selection?.start, 
					onChange: e=>{
						setSelection(sel=>{
							const pos = parseInt(e.target.value)
							return sel ? {...sel, start:pos} : {start: pos, end:pos, direction:"forward"};
						});
					}
				}),
				h("input", {
					type:"number", 
					value:selection?.end, 
					onChange: e=>{
						setSelection(sel=>{
							const pos = parseInt(e.target.value)
							return sel ? {...sel, start:pos} : {start: pos, end:pos, direction:"forward"};
						});
					}
				}),
			),
		),
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
			parseMarkdown(source).map(block=>{
				const children = block.content.map(segment=>{
					if(segment.type==="strong"){
						return h("strong", {}, segment.content)
					}
					else if(segment.type==="emphasis"){
						return h("em", {},segment.content)
					}
					else if(segment.type==="tag"){
						return h("span", {className: "tag"}, segment.content)
					}
					else if(segment.type==="mention"){
						return h("span", {className: "mention"}, segment.content)
					}
					else if(segment.type==="text"){
						return segment.content
					}
				})

				if (block.type==="h1") {
					return h("h1",{}, children);
				}
				else if(block.type==="p") {

					return h("p", {}, children)
				}
			})
		),
		h("textarea", {
			id:"textarea", 
			onInput: (e:any)=>setSource(e.target.value)
		}, source)
	);
}

export default MDEditor;
