import { useState, useRef, useSyncExternalStore, createElement, useEffect } from 'react'
import rangy from "rangy"
import './editor.css'
import documentStore from "./documentStore.js"
import {parseMarkdown, segmentMarkdownText} from "./markdown_helpers.ts"
import { current } from 'immer'

const h = createElement

function selectCharacters(root, selection)
{
	console.assert(root?true:false);
	if(!selection){
		window.getSelection().removeAllRanges();
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
		const node = stack.shift();
		if (node.nodeType==Node.TEXT_NODE) {
			prevPos = position;
			position+=node.length;
			if(node.nextElementSibling==undefined && window.getComputedStyle(node.parentNode).display==="block"){
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
	try {
		range.setStart(startNode, startOffset);
		range.setEnd(endNode, endOffset);

		const currentSelection = document.getSelection();
		const currentRange = currentSelection.getRangeAt(0)
		if(currentRange.startContainer == range.startContainer &&
			currentRange.startOffset == range.startOffset &&
			currentRange.endContainer == range.endContainer &&
			currentRange.endOffset == range.endOffset
		) {
			return;
		}
		document.getSelection().removeAllRanges()
		document.getSelection().addRange(range);

	} catch (error) {
		console.warn("invalid selection range", range);
	}
}
window.selectCharacters = selectCharacters

function getCharacterSelection(root){
	console.assert(root?true:false);
	const currentSelection = window.getSelection();
	if(!currentSelection.rangeCount){
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
		const node = stack.shift();
		if (node.nodeType==Node.TEXT_NODE) {
			
			position+=node.length;
			if(node.nextElementSibling==undefined && window.getComputedStyle(node.parentNode).display==="block"){
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
window.getCharacterSelection = getCharacterSelection;

function MDEditor() {
	const editorDiv = useRef(null);
	const [source, setSource] = useState(`# My _markdown_ editor\n`+
										`This is a **markdown** #richtext editor.\n`+
										`support **strong**, _emphasis_, #tags and @mentions.\n`)
	const [selection, setSelection] = useState([0,0]);
	
	useEffect(()=>{
		selectCharacters(editorDiv.current, selection);
	}, [selection]);
	
	useEffect(()=>{
		document.addEventListener("selectionchange", onSelectionChange);
	}, []);
	
	function onKeyDown(e) {
		e.preventDefault();

		switch (e.key) {
			case "ArrowLeft":
				if(selection.start==selection.end){
					setSelection(sel=>{
						return {start: sel.start-1, end: sel.end-1};
					});
				}else{
					setSelection(sel=>{
						return {start: sel.start, end: sel.start};
					});
				}
				break;
			case "ArrowRight":
				if(selection[0]==selection[1]){
					setSelection(sel=>{
						return {start: sel.start+1, end: sel.end+1};
					});
				}else{
					setSelection(sel=>{
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
	
	function onPaste(e) {
		e.preventDefault();
	}
	
	function onDrop(e) {
		e.preventDefault();
	}
	
	function onSelectionHasChanged(e) {
		e.preventDefault();
		// setSelection(sel=>{
		// 	const selectionRange = getCharacterSelection(editorDiv.current);
		// 	return [selectionRange[0], selectionRange[1]];
		// });
	}
	
	function onSelectionChange(e) {
		e.preventDefault();
		setSelection(sel=>{
			return getCharacterSelection(editorDiv.current);
		});
	}
		
	return h("div",{},
		h("div", {},
			h("div", {},
				"cursor position",
				h("input", {type:"number", value:selection?selection[0]:-1, onChange: e=>setSelection([parseInt(e.target.value), parseInt(e.target.value)])}),

			),
			h("div", {},
				"selection range",
				h("input", {type:"number", value:selection?selection[0]:-1, onChange: e=>setSelection([parseInt(e.target.value), selection[1]])}),
				h("input", {type:"number", value:selection?selection[1]:-1, onChange: e=>setSelection([selection[0], parseInt(e.target.value)])})
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
