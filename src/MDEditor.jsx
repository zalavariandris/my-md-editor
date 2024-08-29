import { useState, useRef, useSyncExternalStore, createElement, useEffect } from 'react'
import rangy from "rangy"
import './editor.css'
import documentStore from "./documentStore.js"
const h = createElement

function selectCharacters(root, start, end){
	let startNode = null;
	let startOffset = 0;
	let endNode = null;
	let endOffset = 0;


	let stack = [...root.childNodes]

	
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
	console.log(startNode, startOffset, endNode, endOffset)
	let range = new Range();
	range.setStart(startNode, startOffset);
	range.setEnd(endNode, endOffset);

	document.getSelection().removeAllRanges()
	document.getSelection().addRange(range);

}
window.selectCharacters = selectCharacters


function segmentMarkdownText(text) {
	// Define regex patterns for different markdown elements
	const strongRegexp = /\*\*([^*]+)\*\*/g;
	const emphasisRegexp = /_([^_]+)_/g;
	const mentionRegexp = /@\w+/g;
	const tagRegexp = /#\w+/g;
	
	// Master regex pattern to match any markdown element
	const masterRegexp = new RegExp(
		`(${strongRegexp.source})|(${emphasisRegexp.source})|(${mentionRegexp.source})|(${tagRegexp.source})`,
		'g'
	);
	
	const segments = [];
	let lastIndex = 0;
	let match;
	
	// Iterate over all matches in the text
	while ((match = masterRegexp.exec(text)) !== null) {
		const [segment] = match;
		
		// Add any plain text before this markdown match
		if (match.index > lastIndex) {
			const plainText = text.slice(lastIndex, match.index);
			if (plainText.trim()) { // Ignore empty spaces
				segments.push({ type: "text", content: plainText });
			}
		}
		
		// Determine the type of the segment based on the regex match
		if (segment.match(strongRegexp)) {
			segments.push({ type: "strong", content: segment });
		} else if (segment.match(emphasisRegexp)) {
			segments.push({ type: "emphasis", content: segment });
		} else if (segment.match(mentionRegexp)) {
			segments.push({ type: "mention", content: segment });
		} else if (segment.match(tagRegexp)) {
			segments.push({ type: "tag", content: segment });
		}
		
		// Update lastIndex to the end of the current match
		lastIndex = match.index + segment.length;
	}
	
	// Add any remaining text after the last markdown match
	if (lastIndex < text.length) {
		const remainingText = text.slice(lastIndex);
		if (remainingText.trim()) { // Ignore empty spaces
			segments.push({ type: "text", content: remainingText });
		}
	}
	
	return segments;
}


function MDEditor() {
	const editorDiv = useRef(null);
	const [source, setSource] = useState(`# My\n`+
										`This is a **markdown** #richtext editor.\n`+
										`support **strong**, _emphasis_, #tags and @mentions.\n`)
		const [selection, setSelection] = useState([0,0]);
		
		useEffect(()=>{
			// setSelectionRelativeToElement(editorDiv.current, selection[0], selection[1]

			selectCharacters(editorDiv.current, selection[0], selection[1]);
			
		}, selection);
		
		
		useEffect(()=>{
			console.log("hey")
			// document.addEventListener("selectionchange", onSelectionChange);
			// window.getSelection().removeAllRanges();
		}, []);
		
		function onKeyDown(e){
			console.log(e.key);
			// const selectionOffset = getSelectionOffsetRelativeToElement(editorDiv.current);
			// // console.log("selectionOffset", selectionOffset)
			// setSource(draft=>{
			// 	  return [draft.slice(0, selectionOffset), e.key, draft.slice(selectionOffset)].join("");
			// }, ()=>{
			// 	console.log("hez")
			// });
			// setSelectionOffsetRelativeToParent(editorDiv.current,selectionOffset+e.key.length);
			e.preventDefault();
		};
		
		function onPaste(e){
			e.preventDefault();
		}
		
		function onDrop(e){
			e.preventDefault();
		}
		
		function onSelectionHasChanged(e)
		{
			// const selection = document.getSelection()
			// console.log("selection has changed", selection);
			
			// if(!selection.rangeCount){
			//   console.log("no selection range"); // no selection
			//   return;
			// }
			// const range = selection.getRangeAt(0);
			// console.log("selection range:", range);
			// if(range.collapsed){ // simple cursor
			
			// }
			
			// console.log(range.getBoundingClientRect())
			// console.log(range.getClientRects())
			
		}
		
		// function onSelectionChange(e){
		//   // console.log("selection change", document.getSelection());
		//   const windowSelection = document.getSelection();
		//   console.log(windowSelection)
		//   if(!windowSelection.rangeCount>0){
		//     setSelection([-1,-1]);
		//     return;
		//   }
		//   const range = windowSelection.getRangeAt(0);
		//   const relativeOffset = getSelectionRangeRelativeToElement(editorDiv)
		//   setSelection([relativeOffset.start, relativeOffset.end]);
		// }
		
		return h("div",{},
			h("input", {type:"number", value:selection?selection[0]:-1, onChange: e=>setSelection([parseInt(e.target.value), parseInt(e.target.value)+1])}),
			h("input", {type:"number", value:selection?selection[0]:-1, onChange: e=>setSelection([parseInt(e.target.value), selection[1]])}),
			h("input", {type:"number", value:selection?selection[1]:-1, onChange: e=>setSelection([selection[0], e.target.value.parseInt()])}),
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
			
			source.split("\n").map(line=>{
				if(line.startsWith("# ")){
					return h("h1", {}, line);
				}
				else{
					const segments = segmentMarkdownText(line);
					const children = segments.map(segment=>{
						if(segment.type==="strong"){
							return h("strong", {},segment.content)
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
					// console.group(line);
					// for(let segment of segments){
					//   console.log([segment.type, segment.content]);
					// }
					// console.groupEnd();
					return h("p", {}, children);
				}
			})
		)
	);
}

export default MDEditor;
