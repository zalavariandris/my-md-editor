import { useState } from 'react'
// import './App.css'
import './editor.css'
import MDEditor from "./MDEditor.tsx"

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <MDEditor></MDEditor>
    {/* <textarea></textarea> */}
    </>
  )
}

export default App
