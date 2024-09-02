import { useState, useRef, useSyncExternalStore, createElement, useEffect } from 'react'
import './editor.css'
import {parseMarkdown, segmentMarkdownText} from "./markdown_helpers.ts"
import { current } from 'immer'

const h = createElement

type TextRange = {
	start: number;
	end: number;
};

type TextSelection = {
	ranges: TextRange[]
};

function clearCharacterSelection(){
	window.getSelection()?.removeAllRanges();
}

function setCharacterSelection(root: HTMLElement, selection: TextSelection)
{
	console.assert(root?true:false);
	if(selection.ranges.length==0){
		window.getSelection()?.removeAllRanges();
		return;
	}

	const textRange = selection.ranges[0];

	let start = textRange.start;
	let end = textRange.end;
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

function getCharacterSelection(root:HTMLElement):TextSelection{
	console.assert(root?true:false);
	const currentSelection = window.getSelection();
	if(!currentSelection || !currentSelection.rangeCount){
		return {ranges: []};
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

	if(!start || !end){
		return {ranges: []};
	}

	return {ranges: [{start, end}]};
}

function MDEditor() {
	const editorDiv = useRef(null);
	const [source, setSource] = useState<string>(`# My _markdown_ editor\n`+
										`This is a **markdown** #richtext editor.\n`+
										`support **strong**, _emphasis_, #tags and @mentions.\n`)
	const [selection, setSelection] = useState<TextSelection>({ranges: [{start: 0, end: 0}]});
	
	useEffect(()=>{
		if(editorDiv.current){
			setCharacterSelection(editorDiv.current, selection!);
		}
	}, [selection]);
	
	useEffect(()=>{
		document.addEventListener("selectionchange", onSelectionChange);
	}, []);
	
	function onKeyDown(e:KeyboardEvent) {
		e.preventDefault();
		if(selection.ranges.length==0){
			return;
		}

		const textRange = selection.ranges[0];

		let msg;
		const IsCollapsed = textRange.start==textRange.end;
		function extendStart(r:TextRange){
			return {start: r.start-1, end: r.end};
		}
		function extendEnd(r:TextRange){
			return {start: r.start, end: r.end+1};
		}
		function moveLeft(sel:TextRange){
			return {start: sel.start-1, end: sel.start-1};
		}
		function moveRight(sel:TextRange){
			return {start: sel.start+1, end: sel.start+1};

		}
		function collapseLeft(sel:TextRange){
			return {start: sel.start, end: sel.start};
		}
		function collapseRight(sel:TextRange){
			return {start: sel.end, end: sel.end};
		}

		if(e.key.length==1){

		}
		else if(e.key == "ArrowLeft"){
			if(IsCollapsed){
				setSelection(sel=> {
					return {ranges: sel.ranges.map(r=>moveLeft(r))};
				});
			}else{
				setSelection(sel=> {
					return {ranges: sel.ranges.map(r=>collapseLeft(r))};
				});
			}
		}
		else if(e.key == "ArrowRight"){
			if(IsCollapsed){
				setSelection(sel=> {
					return {ranges: sel.ranges.map(r=>moveRight(r))};
				});
			}else{
				setSelection(sel=> {
					return {ranges: sel.ranges.map(r=>collapseRight(r))};
				});
			}
		}
		else if(e.key == "ArrowUp"){

		}
		else if(e.key == "ArrowDown"){

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
		if(editorDiv.current){
			setSelection(getCharacterSelection(editorDiv.current));
		}
	}
		
	return h("div",{},
		h("div", {},
			h("div", {},
				"cursor position",
				h("input", {
					type:"number", 
					value:selection.ranges.length>0 ? selection.ranges[0].start : "no selection", 
					onChange: e=>setSelection({ranges: selection.ranges.map(r=>{
							return {start: parseInt(e.target.value), end: parseInt(e.target.value)}
						})
					})
				}),

			),
			h("div", {},
				"selection range",
				h("input", {
					type:"number", 
					value:selection.ranges.length>0 ? selection.ranges[0].start : "no selection", 
					onChange: e=>{
						if(!selection)
							return;
						setSelection({
							ranges: selection.ranges.map(r=>{
								return {start: parseInt(e.target.value), end: r.end};
							})
						});
					}
				}),
				h("input", {
					type:"number", 
					value:selection.ranges.length>0 ? selection.ranges[0].end : "no selection", 
					onChange: e=>{
						if(!selection)
							return;
						setSelection({
							ranges: selection.ranges.map(r=>{
								return {start: r.start, end: parseInt(e.target.value)};
							})
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
		)
	);
}

export default MDEditor;
