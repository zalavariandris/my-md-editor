import { useState } from 'react'
import './editor.css'
import MDEditor from "./MDEditor.tsx"
import {Bibliography} from "./Bibliography.tsx"

const sacksmd = await (await fetch("./6.4 Oliver Sacks és a felnőttkori tanulás.md")).text();

function App() {
  const [text, setText] = useState<string>(sacksmd);

  return (
    <>
    <MDEditor value={text} onChange={setText}></MDEditor>
    <Bibliography></Bibliography>
    </>
  )
}

export default App
