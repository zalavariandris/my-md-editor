import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
// import './App.css'
import './editor.css'
import MDEditor from "./MDEditor.jsx"

function App() {
  const [count, setCount] = useState(0)

  return (
    <MDEditor></MDEditor>
  )
}

export default App
