import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
// import './App.css'
import './editor.css'
import MDEditor from "./MDEditor.tsx"

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <MDEditor></MDEditor>
    <textarea></textarea>
    </>
  )
}

export default App
