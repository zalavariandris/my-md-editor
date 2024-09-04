import { useState } from 'react'
// import './App.css'
import './editor.css'
import MDEditor from "./MDEditor.tsx"
import {Bibliography} from "./Bibliography.jsx"

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
    <MDEditor></MDEditor>
    <Bibliography></Bibliography>
    </>
  )
}

export default App
