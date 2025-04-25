// src/pyContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react"
import { loadPyodide, PyodideInterface } from "pyodide"

const PyContext = createContext<PyodideInterface | null>(null)

export const PyodideProvider: React.FC = ({ children }) => {
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null)

  useEffect(() => {
    (async () => {
      const p = await loadPyodide({ stdout: console.log })
      setPyodide(p)
    })()
  }, [])

  return (
    <PyContext.Provider value={pyodide}>
      {children}
    </PyContext.Provider>
  )
}

export const usePyodide = () => {
  const ctx = useContext(PyContext)
  if (!ctx) throw new Error("Pyodide not ready")
  return ctx
}
