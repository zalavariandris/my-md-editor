import { Children, KeyboardEvent, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.js'
import './index.css'
import { parse } from 'astrocite-bibtex';
import {CSL} from "./vendor/citeproc_commonjs.js"
import { bibtex } from 'astrocite';
import { parseMarkdown } from './markdown_helpers.js';
import "./editor.css"
import { getTextSelection } from './TextSelection.js';
import type { TextSelection } from './TextSelection.js';
import type { DocumentModel, DocumentBlock, DocumentSegment } from './markdown_helpers.js';

/* ***** *
* STATE *
* ***** */
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

async function fetchMarkdown(url:string){
	const response = await fetch(url);
	const text = await response.text();
	return text;
}

let sacksmd = await fetchMarkdown("./6.4 Oliver Sacks és a felnőttkori tanulás.md");
function setSource(value:string){
	sacksmd = value;
}

const memoParseMarkdown = memoize(parseMarkdown)

let doc = ()=>memoParseMarkdown(sacksmd);


let selection:TextSelection|null = null;
function setSelection(val:TextSelection|null){
	selection = val;
	console.log("selection changed")
}

/* **************************** *
 * bibliographic reference DATA *
 * **************************** */
async function fetchReferences(url:string) {
	const result = await fetch(url);
	const text = await result.text();
	return parse(text);
}
const references:any[] = await fetchReferences("./ref.bib");
console.log("references:", references);

/* ************** *
* CITATIONS DATA *
* ************** */
type ItemType = [
	/*see: https://citeproc-js.readthedocs.io/en/latest/csl-json/markup.html*/
	{
		id:string,
		[key:string]: string
	}
];

type CiteItem = {
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
	citationItems: CiteItem[];
	properties: any;
}

/*
create in document citations
#todo: collect from document
*/

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

const citations = getCitationsFromDocument(doc());

console.log("citations:", citations);



/* ==================== */
var styleID = "apa";


var xhr = new XMLHttpRequest();

const style = await (await fetch(`https://raw.githubusercontent.com/citation-style-language/styles/master/${styleID}.csl`)).text();
console.assert(style?true:false);

// Initialize a system object, which contains two methods needed by the
// engine.
const citeprocSys = {
	// Given a language tag in RFC-4646 form, this method retrieves the
	// locale definition file.  This method must return a valid *serialized*
	// CSL locale. (In other words, an blob of XML as an unparsed string.  The
	// processor will fail on a native XML object or buffer).
	retrieveLocale: function (lang:string) {
		xhr.open('GET', `https://raw.githubusercontent.com/Juris-M/citeproc-js-docs/master/locales-${lang}.xml`, false);
		xhr.send(null);
		return xhr.responseText;
	},
	
	// Given an identifier, this retrieves one citation item.  This method
	// must return a valid CSL-JSON object.
	retrieveItem: function(id:string) {
		const itemIdx = references.findIndex((item)=>item.id==id)
		return references[itemIdx];
	}
};

// Given the identifier of a CSL style, this function instantiates a CSL.Engine
// object that can render citations in that style.
function getProcessor() {
	// Instantiate and return the engine
	var citeproc = new CSL.Engine(citeprocSys, style);
	return citeproc;
};

var citeproc = getProcessor();

// var citationsPre = [ ["adolph.etal_2014", 1] ];
// var citationsPost = [ ["adolph.etal_2014", 1] ];
var result = citeproc.processCitationCluster(citations[0], [], []);

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

let bibliography:Bibliography = citeproc.makeBibliography();
console.log("bibliography:", bibliography)


/* ********** *
* COMPONENTS *
* ********** */
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


function renderEditor():HTMLElement {
	const blockElements = doc().map(block=>{
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
	
	const frame = createElement("div", {
		class:"editor",
		contenteditable: true,
		onKeyDown: (e:KeyboardEvent)=>{
			if(selection){
				e.preventDefault();
				if(e.key.length==1){
					const text = e.key as string;
					insertTextAtPos(sacksmd, e.key, selection.end);
				}
				console.log(e)
			}
		}
	}, blockElements);
	
	document.addEventListener("selectionchange", () => {
		console.log(document.getSelection());
		selection = getTextSelection(frame);
		setSelection(selection);
	});
	
	return frame;
}

function renderBibliography():HTMLElement
{
	const frame = createElement("div");
	const header = createElement("h1", {}, ["Bibliography"]);
	
	const list = document.createElement("ul");
	for(let entry of bibliography[1]){
		const li = document.createElement("li");
		li.innerHTML = entry;
		list.appendChild(li);
	}
	frame.appendChild(header);
	frame.appendChild(list);
	return frame;
}

/* INITIAL RENDER */
function render(root:HTMLElement):void {
	const editorElement = renderEditor();
	const bibliographyElement = renderBibliography();
	root.replaceChildren(editorElement, bibliographyElement);
}

render(document.getElementById("root") || document.body);