import { parse } from 'astrocite-bibtex';
import {CSL} from "./vendor/citeproc_commonjs.js"
import { useEffect } from 'react';
import { useState } from 'react';
import './bibliography.css'
// window.xmljson = xmljson

// `
// The retrieveLocale() function fetches CSL locales needed at runtime. The locale 
// source is available for download from the CSL locales repository. The function 
// takes a single RFC 5646 language tag as its sole argument, and returns a locale 
// object. The return may be a serialized XML string, an E4X object, 
// a DOM document, or a JSON or JavaScript representation of the locale XML. 
// If the requested locale is not available, the function must return a value that
// tests false. The function must return a value for the us locale.
// https://citeproc-js.readthedocs.io/en/latest/running.html#required-sys-functions
// `
// function retreiveLocale(RFC_5646_language_tag="en-US"){
//   return "xml string"
// }

// `
// The retrieveItem() function fetches citation data for an item. The function
// takes an item ID as its sole argument, and returns a JavaScript object in
// CSL JSON format.
// `
// function retreiveItem(itemID){
//     const cslJson = parse(`
//     @article{my_article,
//         title = {Hello world},
//         journal = "Some Journal"
//     }
//     `);
//   return cslJson;
// }

// // window.CSL = CSL;

// window.csl  = new CSL({retreiveLocale, retreiveItem}, style, true);
type ItemType = [
	{
		id:string,
		[key:string]: string
	}
];

function Bibliography({...props}) {
	// const [citationArray, setCitationArray] = useState<any[]>([]);
	// const [locale, setLocale] = useState(null);
	
	// fetch citations
	useEffect(()=>{
		fetch("./ref.bib")
		.then((response)=>{
			response.text().then((text)=>{

				// parse citations to array
				const items = parse(text);
				console.log(items);

				/* ==================== */
				var styleID = "apa";

				var xhr = new XMLHttpRequest();


				// get CSL style
				xhr.open('GET', 'https://raw.githubusercontent.com/citation-style-language/styles/master/' + styleID + '.csl', false);
				xhr.send(null);
				var style = xhr.responseText;
				console.assert(style?true:false);

				// Initialize a system object, which contains two methods needed by the
				// engine.
				const citeprocSys = {
					// Given a language tag in RFC-4646 form, this method retrieves the
					// locale definition file.  This method must return a valid *serialized*
					// CSL locale. (In other words, an blob of XML as an unparsed string.  The
					// processor will fail on a native XML object or buffer).
					retrieveLocale: function (lang:string){
						xhr.open('GET', 'https://raw.githubusercontent.com/Juris-M/citeproc-js-docs/master/locales-' + lang + '.xml', false);
						xhr.send(null);
						return xhr.responseText;
					},

					// Given an identifier, this retrieves one citation item.  This method
					// must return a valid CSL-JSON object.
					retrieveItem: function(id:string){
						const itemIdx = items.findIndex((item)=>item.id==id)
						return items[itemIdx];
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

				var citeDiv = document.getElementById('cite-div');
				var citationParams = citations[0];
				var citationStrings = citeproc.processCitationCluster(citationParams[0], citationParams[1], [])[1];
				



			})
		})
	}, []);

	

	// useEffect(()=>{
	// 	// update cite processor
	// 	const citeprocSys = {
	// 	  retrieveLocale: function (lang){
	// 	    var xhr = new XMLHttpRequest();
	// 	    xhr.open('GET', 'https://raw.githubusercontent.com/Juris-M/citeproc-js-docs/master/locales-' + lang + '.xml', false);
	// 	    xhr.send(null);
	// 	    return xhr.responseText;
	// 	  },
	// 	  retrieveItem: function(id){
	// 	    return citations[id];
	// 	  }
	// 	};

	// 	function getProcessor(styleID) {
	// 	  var xhr = new XMLHttpRequest();
	// 	  xhr.open('GET', 'https://raw.githubusercontent.com/citation-style-language/styles/master/' + styleID + '.csl', false);
	// 	  xhr.send(null);
	// 	  var styleAsText = xhr.responseText;
	// 	  var citeproc = new CSL.Engine(citeprocSys, styleAsText);
	// 	  return citeproc;
	// 	};

	// 	function processorOutput() {
	// 	  // ret = '';
	// 	  var citeproc = getProcessor(chosenStyleID);
	// 	  citeproc.updateItems(itemIDs);
	// 	  var result = citeproc.makeBibliography();
	// 	  return result;
	// 	}
	// }, [citations]);



		// //Style and Data
		// var chosenLibraryItems = "https://api.zotero.org/groups/459003/items?format=csljson&limit=8&itemType=journalArticle";
		// var chosenStyleID = "chicago-fullnote-bibliography";
		// var xhr = new XMLHttpRequest();
		// xhr.open('GET', chosenLibraryItems, false);
		// xhr.send(null);
		// var citationData = JSON.parse(xhr.responseText);
		
		// Data rearrangement
		// var citations = {};
		// var itemIDs = [];
		// for (var i=0,ilen=citationData.items.length;i<ilen;i++) {
		// 	var item = citationData.items[i];
		// 	if (!item.issued) continue;
		// 	if (item.URL) delete item.URL;
		// 	var id = item.id;
		// 	citations[id] = item;
		// 	itemIDs.push(id);
		// }
		

		
		// function getProcessor(styleID) {
		//   var xhr = new XMLHttpRequest();
		//   xhr.open('GET', 'https://raw.githubusercontent.com/citation-style-language/styles/master/' + styleID + '.csl', false);
		//   xhr.send(null);
		//   var styleAsText = xhr.responseText;
		//   var citeproc = new CSL.Engine(citeprocSys, styleAsText);
		//   return citeproc;
		// };
		
		// function processorOutput() {
		//   // ret = '';
		//   var citeproc = getProcessor(chosenStyleID);
		//   citeproc.updateItems(itemIDs);
		//   var result = citeproc.makeBibliography();
		//   return result;
		// }
		
		// console.log(processorOutput());

	function cite(citeID:string) {
		// if(citeID in citations){
		// 	// get style XML
		// 	const styleID = "chicago-fullnote-bibliography";
		// 	const xhr = new XMLHttpRequest();
		// 	xhr.open('GET', 'https://raw.githubusercontent.com/citation-style-language/styles/master/' + styleID + '.csl', false);
		// 	xhr.send(null);
		// 	const styleAsText = xhr.responseText;

		// 	// create citeproc object
		// 	const citeprocSys = {
		// 		retrieveLocale: function (lang){
		// 			var xhr = new XMLHttpRequest();
		// 			xhr.open('GET', 'https://raw.githubusercontent.com/Juris-M/citeproc-js-docs/master/locales-' + lang + '.xml', false);
		// 			xhr.send(null);
		// 			return xhr.responseText;
		// 		},
		// 		retrieveItem: function(id){
		// 			return citations[id];
		// 		}
		// 	};
		// 	const citeproc = new CSL.Engine(citeprocSys, styleAsText);
		// 	citeproc.updateItems(citations)

		// 	// process citation
		// 	const citation = {
		// 		properties: {
		// 			noteIndex: 3
		// 		},
		// 		citationItems: Object.entries(citations).map(([id, props])=>{
		// 			return {id, ...props};
		// 		})
		// 	}
		// 	var citationsPre = [ ["citation-quaTheb4", 1], ["citation-mileiK4k", 2] ];
		// 	var citationsPost = [ ["citation-adaNgoh1", 4] ];
		// 	var result = citeproc.processCitationCluster(citation, citationsPre, citationsPost);
		// 	console.log(JSON.stringify(result[0], null, 2));
		// 	console.log(JSON.stringify(result[1], null, 2));

		// 	// return result;
		// 	return citeID;
		// }
		return citeID;
	}
	
	return <div className="bibliography">
		<h1>Bibliography</h1>
		{/* {Object.entries(citations).map(([citeID, citation])=>{
			return <li>{cite(citeID)}</li>
		})} */}
	</div>
	}
	
	export {Bibliography};