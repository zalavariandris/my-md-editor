import { useState, useRef, useSyncExternalStore, createElement, useEffect } from 'react'
import './editor.css'
import {parseMarkdown, segmentMarkdownText} from "./markdown_helpers.ts"
import { current } from 'immer'

const h = createElement

type TextRange = {
	start: number;
	end: number;
};

function selectCharacters(root: HTMLElement, selection: TextRange | undefined)
{
	console.assert(root?true:false);
	if(!selection){
		const currentSelection = window.getSelection();
		if(currentSelection){
			currentSelection.removeAllRanges();
		}
		
		return;
	}

	let start = selection.start;
	let end = selection.end;
	if(start>end){
		[start, end] = [end, start];
	}

	let startNode = null;
	let startOffset = 0;
	let endNode = null;
	let endOffset = 0;

	let stack = [...root.childNodes];

	
	let position = 0;
	let prevPos = position;
	while(stack.length>0)
	{
		const node:ChildNode|undefined = stack.shift();
		if(!node){
			break;
		}
		if (node.nodeType==Node.TEXT_NODE) {
			const textNode = node as Text;
			prevPos = position;
			position+=textNode.length;
			if (textNode.nextElementSibling==undefined && 
				textNode.parentElement && 
				window.getComputedStyle(textNode.parentElement).display==="block") {
				position+=1;
			}
		}
		else {
			stack = [...node.childNodes, ...stack];
		}

		if (!startNode && position > start) {
			startNode = node;
			startOffset = start-prevPos;
		}
		if (position > end) {
			endNode = node;
			endOffset = end-prevPos;
			break;
		}

	}

	//select the range
	let range = new Range();
	if(startNode && endNode){
		range.setStart(startNode, startOffset);
		range.setEnd(endNode, endOffset);
	}
	try {


		const currentSelection = document.getSelection();
		const currentRange = currentSelection?.getRangeAt(0);
		if(currentRange &&
			currentRange.startContainer == range.startContainer &&
			currentRange.startOffset == range.startOffset &&
			currentRange.endContainer == range.endContainer &&
			currentRange.endOffset == range.endOffset
		) {
			return;
		}

		currentSelection?.removeAllRanges()
		currentSelection?.addRange(range);

	} catch (error) {
		console.warn("invalid selection range", range);
	}
}

function getCharacterSelection(root:HTMLElement){
	console.assert(root?true:false);
	const currentSelection = window.getSelection();
	if(!currentSelection || !currentSelection.rangeCount){
		return null;
	}
	const selectionRange = currentSelection.getRangeAt(0);

	let start = undefined;
	let end = undefined;

	let stack = [...root.childNodes]

	let prevPos = 0;
	let position = 0;
	while(stack.length>0)
	{
		prevPos = position;
		const node:Node = stack.shift()!;
		if (node.nodeType==Node.TEXT_NODE) {
			const textNode = node as Text;
			position+=textNode.length;
			if(textNode.nextElementSibling==undefined && textNode.parentElement && window.getComputedStyle(textNode.parentElement).display==="block"){
				position+=1;
			}
		}
		else {
			stack = [...node.childNodes, ...stack];
		}

		if(!start && selectionRange.startContainer == node){
			start = prevPos+selectionRange.startOffset;
		}

		if(!end && selectionRange.endContainer == node){
			end = prevPos+selectionRange.endOffset;
			
		}

		if(end!=undefined && start!=undefined){
			break;
		}
		
	}

	return {start, end};
}

function MDEditor() {
	const editorDiv = useRef(null);
	const [source, setSource] = useState<string>(`# My _markdown_ editor\n`+
										`This is a **markdown** #richtext editor.\n`+
										`support **strong**, _emphasis_, #tags and @mentions.\n`)
	const [selection, setSelection] = useState<TextRange|undefined>({start: 0,end: 0} as TextRange);
	
	useEffect(()=>{
		if(editorDiv.current){
			selectCharacters(editorDiv.current, selection);
		}
	}, [selection]);
	
	useEffect(()=>{
		document.addEventListener("selectionchange", onSelectionChange);
	}, []);
	
	function onKeyDown(e:KeyboardEvent) {
		e.preventDefault();
		if(!selection){
			return;
		}

		switch (e.key) {
			case "ArrowLeft":
				if(selection.start==selection.end){
					setSelection(sel=>{
						if(!sel){
							return;
						}
						return {start: sel.start-1, end: sel.end-1};
					});
				}else{
					setSelection(sel=>{
						if(!sel){
							return;
						}
						return {start: sel.start, end: sel.start};
					});
				}
				break;
			case "ArrowRight":
				if(selection.start==selection.end){
					setSelection(sel=>{
						if(!sel)
							return undefined;
						return {start: sel.start+1, end: sel.end+1};
					});
				}else{
					setSelection(sel=>{
						if(!sel)
							return undefined;
						return {start: sel.start, end: sel.end};
					});
				}
				break;
			case "ArrowUp":		
				break;
			case "ArrowDown":
				break;
			default:
				break;
		}

		if(e.key.length==1){

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
		// setSelection(sel=>{
		// 	const selectionRange = getCharacterSelection(editorDiv.current);
		// 	return [selectionRange[0], selectionRange[1]];
		// });
	}
	
	function onSelectionChange(e: any) {
		e.preventDefault();
		setSelection(sel=>{
			if(editorDiv.current){
				return getCharacterSelection(editorDiv.current);
			}
		});
	}
		
	return h("div",{},
		h("div", {},
			h("div", {},
				"cursor position",
				h("input", {type:"number", value:selection?selection.start : "no selection", onChange: e=>setSelection({start: parseInt(e.target.value), end: parseInt(e.target.value)})}),

			),
			h("div", {},
				"selection range",
				h("input", {
					type:"number", 
					value:selection?selection.start : "no selection", 
					onChange: e=>{
						if(!selection)
							return;
						setSelection({start: parseInt(e.target.value), end: selection.end});
					}
				}),
				h("input", {
					type:"number", 
					value:selection?selection.end:-1, 
					onChange: e=>{
						if(!selection)
							return;
						setSelection({start: selection.start, end: parseInt(e.target.value)});

					}
				}
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
		)
	);
}

export default MDEditor;
