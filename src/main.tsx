import { Children, KeyboardEvent, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.js'
import './index.css'
import { parse } from 'astrocite-bibtex';
import { Data } from 'csl-json';
import {CSL} from "./vendor/citeproc_commonjs.js"
import { bibtex } from 'astrocite';
import { parseMarkdown } from './markdown_helpers.js';
import "./editor.css"
import { getTextSelection, setTextSelection, clearTextSelection, collapseTextSelectionToStart, collapseTextSelectionToEnd, modifyTextSelection } from './TextSelection.js';
import type { TextSelection } from './TextSelection.js';
import type { DocumentModel, DocumentBlock, DocumentSegment } from './markdown_helpers.js';
import { produce } from 'immer';


/* ******* *
 * HELPERS *
 * ******* */
function memoize<T extends (...args: any[]) => any>(fn: T): (...args: Parameters<T>) => ReturnType<T> {
    let cache: Record<string, ReturnType<T>> = {};

    return (...args: Parameters<T>): ReturnType<T> => {
        let n = args[0]; // Assuming only one argument is used for memoization
        if (n in cache) {
            // Fetching from cache
            return cache[n];
        } else {
            // Calculating result
            let result = fn(n);
            cache[n] = result;
            return result;
        }
    };
}

type Props = {
	[key: string]: string | boolean | EventListenerOrEventListenerObject;
};

function createElement(
	tag: string,
	props: Props = {},
	children: (HTMLElement | string)[] = []
): HTMLElement {
	// Create the element with the given tag
	const element = document.createElement(tag);
	
	// Set attributes and add event listeners
	for (const key in props) {
		if (props.hasOwnProperty(key)) {
			const value = props[key];
			if (key.startsWith('on') && typeof value === 'function') {
				// If the key starts with 'on', assume it's an event listener
				const eventName = key.slice(2).toLowerCase();
				element.addEventListener(eventName, value as EventListener);
			}
			else if (typeof value === 'boolean'){
				element.setAttribute(key, "");
			}
			else {
				element.setAttribute(key, value as string);
			}
		}
	}
	
	// Append children
	children.forEach(child => {
		if (typeof child === 'string') {
			// If child is a string, create a text node
			element.appendChild(document.createTextNode(child));
		} else {
			// Otherwise, append the child element directly
			element.appendChild(child);
		}
	});
	
	return element;
}

/* ***** *
 * STATE *
 * ***** */
let needsRender = true;
let needsSelection = true;

async function fetchMarkdown(url:string):Promise<string>{
	const response = await fetch(url);
	const text = await response.text();
	return text;
}


type Model = {
	selection: TextSelection | null;
	source: string;
}

type Msg
	= {type:"insert", text: string}
	| {type:"removeBackward"}
	| {type:"removeForward"}
	| {type:"extendSelectionLeft"}
	| {type:"moveCaretLeft"}
	| {type:"extendSelectionRight"}
	| {type:"moveCaretRight"}
	| {type:"moveCaretUp"}
	| {type:"moveCaretDown"}
	| {type:"select", selection:TextSelection | null};

function update(msg:Msg, model:Model):Model {
	switch (msg.type) {
		case "insert":
			return produce(model, draft=>{
				if(!draft.selection)
					return;
				
				if(draft.selection.start!=draft.selection.end){
					draft.source = removeTextInRange(draft.source, draft.selection.start, draft.selection.end)
				}
				draft.selection = collapseTextSelectionToStart(draft.selection);
				draft.source = insertTextAtPos(draft.source, msg.text, draft.selection.start);
				draft.selection = {start: draft.selection.start+1, end: draft.selection.end+1, direction:"forward"};
				return draft;
			});
			break;
		case "removeBackward":
			return produce(model, draft=>{
				if(!draft.selection)
					return;
				
				if(draft.selection.start!=draft.selection.end){
					draft.source = removeTextInRange(draft.source, draft.selection.start, draft.selection.end)
				}
				else{
					draft.source = removeTextInRange(draft.source, draft.selection.start-1, draft.selection.end);
					draft.selection = {start: draft.selection.start-1, end: draft.selection.end-1, direction:"forward"};
				}
				return draft;
			});
			break;
		case "removeForward":
			return produce(model, draft=>{
				if(!draft.selection)
					return;
				
				if(draft.selection.start!=draft.selection.end){
					draft.source = removeTextInRange(draft.source, draft.selection.start, draft.selection.end)
				}
				else{
					draft.source = removeTextInRange(draft.source, draft.selection.start, draft.selection.end+1);
					draft.selection = {start: draft.selection.start, end: draft.selection.end, direction:"forward"};
				}
				return draft;
			});
			break;
		case "moveCaretLeft":
			return produce(model, draft=>{
				if(draft.selection)
					if(draft.selection.start == draft.selection.end)
						draft.selection = modifyTextSelection("move", "backward", "character", draft.selection);
					else
						draft.selection = collapseTextSelectionToStart(draft.selection);
				return draft;
			})
			break;
		case "moveCaretRight":
			return produce(model, draft=>{
				if(draft.selection)
					if(draft.selection.start == draft.selection.end)
						draft.selection = modifyTextSelection("move", "forward", "character", draft.selection);
					else
						draft.selection = collapseTextSelectionToEnd(draft.selection);
				return draft;
			})
		case "extendSelectionLeft":
			return produce(model, draft=>{
				if(draft.selection)
					draft.selection = modifyTextSelection("extend", "backward", "character", draft.selection);
				return draft;
			});
			break;
		case "extendSelectionRight":
			return produce(model, draft=>{
				if(draft.selection)
					draft.selection = modifyTextSelection("extend", "forward", "character", draft.selection);
				return draft;
			})
			break;
		case "select":
			return produce(model, draft=>{
				draft.selection = msg.selection;
				return draft;
			});
		default:
			return model;
	}
}
window.update = update;

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
window.insertTextAtPos = insertTextAtPos;

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
window.removeTextInRange = removeTextInRange;

const memoParseMarkdown = memoize(parseMarkdown)




/* **************************** *
 * bibliographic reference DATA *
 * **************************** */
type ReferenceItem = Data;

async function fetchReferences(url:string):Promise<ReferenceItem[]> {
	const result = await fetch(url);
	const text = await result.text();
	return parse(text);
}
const references:ReferenceItem[] = await fetchReferences("./ref.bib");
console.log("references:", references);

/* ************** *
* CITATIONS DATA *
* ************** */
type CitationItem = {
	/*see: https://citeproc-js.readthedocs.io/en/latest/csl-json/markup.html*/
	"id":string;
	"locator"?: string | number;
	"label"?: string;
	"prefix"?: string;
	"suffix"?: string;
	"suppress-author"?:boolean;
	"author-only"?:boolean;
	"position"?:number;
	"near-note"?: boolean;
}

type Citation = {
	/*see: https://citeproc-js.readthedocs.io/en/latest/csl-json/markup.html*/
	citationItems: CitationItem[];
	properties: any;
}

function getCitationsFromDocument(doc:DocumentModel){
	return doc.reduce((accumulator:any[], currentValue)=>[...accumulator, ...currentValue.content], [])
		.filter(segment=>segment.type=="mention")
		.map(mention=>{
			return {
				citationItems:[{
					"id": mention.content.slice(1),
					"locator": 123,
					"label": "page",
					"prefix": "See ",
					"suffix": " (arguing that X is Y)"
				}],
				properties: {
					noteIndex: 1
				}
			};
		});
}


/* ==================== */
var styleID = "apa";

async function fetchCSL(styleID:string) {
	const response = await fetch(`https://raw.githubusercontent.com/citation-style-language/styles/master/${styleID}.csl`);
	const csl = await response.text();
	return csl;
}

const style = await fetchCSL(styleID);
console.assert(style?true:false);

// Initialize a system object, which contains two methods needed by the
// engine.
var xhr = new XMLHttpRequest();


// Given the identifier of a CSL style, this function instantiates a CSL.Engine
// object that can render citations in that style.


function getProcessor(references: ReferenceItem[]) {
	// Instantiate and return the engine
	var citeproc = new CSL.Engine({
		retrieveLocale: function (lang:string) {
			xhr.open('GET', `https://raw.githubusercontent.com/Juris-M/citeproc-js-docs/master/locales-${lang}.xml`, false);
			xhr.send(null);
			return xhr.responseText;
		},
		retrieveItem: function(id:string) {
			const itemIdx = references.findIndex((item)=>item.id==id)
			return references[itemIdx];
		}
	}, style);
	return citeproc;
};





type FormattingParameters = {
	maxoffset: number;
	entryspacing: number;
	linespacing: number;
	hangingindent: boolean;
	"second-field-align": boolean;
	bibstart: string;
	bibend: string;
	bibliography_errors: any[];
	entry_ids: string[];
}

type Bibliography = [
	FormattingParameters,
	string[]
];


// function getCiteCluster(source:string, references:ReferenceItem[]){
// 	var citeproc = getProcessor(references);
// 	var citationsPre = [ ["adolph.etal_2014", 1] ];
// 	var citationsPost = [ ["adolph.etal_2014", 1] ];
// 	var result = citeproc.processCitationCluster(citations[0], [], []);
// }

function getBibliography(references:ReferenceItem[]) {
	var citeproc = getProcessor(references);
	// var citationsPre = [ ["adolph.etal_2014", 1] ];
	// var citationsPost = [ ["adolph.etal_2014", 1] ];
	// var result = citeproc.processCitationCluster(citations[0], [], []);
	citeproc.updateItems(references.map(ref=>ref.id));
	const bibliography:Bibliography = citeproc.makeBibliography();
	console.log("bibliography:", bibliography)
	return bibliography;
}


/* ********** *
* COMPONENTS *
* ********** */

function renderEditor(model:Model):HTMLElement {
	const doc = memoParseMarkdown(model.source);
	const blockElements = doc.map(block=>{
		const children:(HTMLElement | string)[] = block.content.map(segment=>{
			let textContent = segment.content;
			if (segment.type==="strong") {
				return createElement("strong", {}, [textContent]);
			}
			else if (segment.type==="emphasis") {
				return createElement("em", {}, [textContent]);
			}
			else if (segment.type==="tag") {
				return createElement("span", {class: "tag"}, [textContent]);
			}
			else if (segment.type==="mention") {
				return createElement("span", {class: "mention"}, [textContent]);
			}
			else if (segment.type==="text") {
				return textContent
			}
			else {
				throw new Error(`not supported segment type: ${segment.type}`);
			}
		})
		if (block.type==="h1") {
			return createElement("h1", {}, children);
		}
		else if(block.type==="p") {
			return createElement("p", {}, children);
		}
		else {
			throw new Error(`not supported block type: ${block.type}`);
		}
	});
		
	const frame = createElement("div", {
		class:"editor",
		contenteditable: true,
		onKeyDown: 	(e:KeyboardEvent) => {
			e.preventDefault();
			let newModel = model;
			if (e.key.length==1) {
				const text = e.key as string;
				newModel = update({type: "insert", text}, model);
			}
			else if(e.key == "Enter"){
				
			}
			else if(e.key == "Backspace") {
				newModel = update({type: "removeBackward"}, model);
			}
			else if(e.key == "Delete"){
				newModel = update({type: "removeForward"}, model);
			}
			else if (e.key == "ArrowLeft") {
				if(e.shiftKey)
					newModel = update({type: "extendSelectionLeft"}, model);
				else
					newModel = update({type: "moveCaretLeft"}, model);
			}
			else if (e.key == "ArrowRight") {
				if(e.shiftKey)
					newModel = update({type: "extendSelectionRight"}, model);
				else
					newModel = update({type: "moveCaretRight"}, model);
			}
			else if (e.key == "ArrowUp") {
				newModel = update({type: "moveCaretUp"}, model);
			}
			else if (e.key == "ArrowDown") {
				newModel = update({type: "moveCaretDown"}, model);
			}
		
			if (newModel!=model) {
				needsRender = newModel.source!=model.source;
				needsSelection = newModel.selection!=model.selection;
				if(needsRender || needsSelection){
					scheduleUpdate(newModel);
				}
			}
		}
	}, blockElements);
	
	document.addEventListener("selectionchange", (e)=>{
		e.preventDefault();
		const newSelection = getTextSelection(frame);
		console.log(newSelection);
		const newModel = update({type: "select", selection: newSelection}, model)
		if (newModel!=model) {
			needsRender = newModel.source!=model.source;
			needsSelection = newModel.selection!=model.selection;
			if(needsRender || needsSelection){
				scheduleUpdate(newModel);
			}
		}
	});
	
	return frame;
}

function renderCitationCluster():HTMLElement{

}

function renderBibliography(bibliography:Bibliography):HTMLElement
{
	const frame = createElement("div");
	frame.style["line-spacing"] = "2rem";
	frame.style["text-indend"] = "2cw";
	const header = createElement("h1", {}, ["Bibliography"]);
	
	const list = document.createElement("ul");
	for (let entry of bibliography[1]) {
		const li = document.createElement("li");
		li.innerHTML = entry;
		list.appendChild(li);
	}
	frame.appendChild(header);
	frame.appendChild(list);
	return frame;
}

/* INITIAL RENDER */
function getRoot():HTMLElement{
	return document.getElementById("root") || document.body;
}

function render(model:Model):void {
	const editorElement = renderEditor(model);
	const bibliographyElement = renderBibliography(getBibliography(references));
	getRoot().replaceChildren(editorElement, bibliographyElement);
}

function tick(model:Model){
	
	if (needsRender) {
		render(model);
		needsRender = false;
	}
	if (needsSelection) {
		console.log("tick", model.selection)
		if (model.selection) {
			setTextSelection(getRoot(), model.selection);
		}else{
			clearTextSelection(getRoot());
		}
		needsSelection = false;
	}
}

let scheduled = false;
function scheduleUpdate(model:Model) {
	if(scheduled)
		return;

	scheduled = true;
	requestAnimationFrame(()=>{
		tick(model);
		scheduled = false;
	})
}

scheduleUpdate({
	source: await fetchMarkdown("./6.4 Oliver Sacks és a felnőttkori tanulás.md"),
	selection: null
});