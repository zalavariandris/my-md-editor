import { useState, useSyncExternalStore, createElement, useEffect } from 'react'

import './editor.css'
import documentStore from "./documentStore.js"
const h = createElement


function segmentMarkdownText(text) {
    const strongRegexp = /\*\*[^*]+\*\*/g;
    const emphasisRegexp = /_[^_]_+/g;
    const mentionRegexp = /@\w+/g;
    const tagRegexp = /#\w+/g;
    const textRegexp = /./g;

    const masterRegexp = new RegExp(
      `(${strongRegexp.source})|(${emphasisRegexp.source})|(${mentionRegexp.source})|(${tagRegexp.source})|(${textRegexp.source})`,
      'g'
    );


    const segments = [];
  
    let match;
    while ((match = masterRegexp.exec(text)) !== null) {
      let segment = match[0];
  
      if (segment.startsWith("**")) {
        segments.push({ type: "strong", content: segment });
      } else if (segment.startsWith("_")) {
        segments.push({ type: "emphasis", content: segment });
      } else if (segment.startsWith("@")) {
        segments.push({ type: "mention", content: segment });
      } else if (segment.startsWith("#")) {
        segments.push({ type: "tag", content: segment });
      } else {
        segments.push({ type: "text", content: segment });
      }
    }
  
    return segments;
  }
  
  // Example usage
  const inputText = "support **strong**, _emphasis_, #tags and @mentions";
  const segmentedOutput = segmentMarkdownText(inputText);
  
  console.log(segmentedOutput);
  
window.segmentMarkdownText = segmentMarkdownText;


function NodeView({node, ...props}){
    if(node.type=="h1"){
        return h("h1",{
          'data-id':node.id, 
          key:node.id
        },
        node.content.map( child=>NodeView({node:child, key:node.id})) );
    }
    else if(node.type=="p"){
        return h("p",{
          'data-id':node.id,
          key:node.id
        },
        node.content.map( child=>NodeView({node:child, key:node.id})) );
    }
    else if(node.type=="strong"){
      return h("strong", {
        'data-id':node.id,
        key:node.id
      }, node.content)
    }
    else if(node.type=="emphasis"){
      return h("em",{
        'data-id':node.id,
        key:node.id,
      }, node.content)
    }
    else if(node.type=="tag"){
      return h("span", {
        'data-id':node.id,
        key:node.id,
        className: "tag"
      }, node.content)
    }
    else if(node.type=="mention"){
      return h("span", {
        'data-id':node.id,
        key:node.id,
        className: "mention"
      }, node.content)
    }
    else if(typeof node === 'string' || node instanceof String){
        return node;
    }
}

function MDEditor() {
  const doc = useSyncExternalStore(documentStore.subscribe, documentStore.getSnapshot);

  useEffect(()=>{
    console.log("hey")
    // document.addEventListener("selectionchange", onSelectionChange);
  }, []);

  function onKeyDown(e){
    e.preventDefault();
  };

  function onSelectionHasChanged(e)
  {
    const selection = document.getSelection()
    console.log("selection has changed", selection);

    if(!selection.rangeCount){
      console.log("no selection range"); // no selection
      return;
    }
    const range = selection.getRangeAt(0);
    console.log("selection range:", range);
    if(range.collapsed){ // simple cursor

    }

    // console.log(range.getBoundingClientRect())
    // console.log(range.getClientRects())

  }

  function onSelectionChange(e){
    console.log("selection change", document.getSelection());
  }

  return h("div",{
      className:"editor",
      contentEditable:true,
      onKeyDown:onKeyDown,
      onSelect:onSelectionHasChanged,
      suppressContentEditableWarning: true
    },

    doc.source.split("\n").map(line=>{
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
  );
}

export default MDEditor;
