import React, { useState } from "react"
import { usePyodide } from "./pyContext"

export function PyExample() {
  const pyodide = usePyodide()
  const [out, setOut] = useState<any>(null)

  async function sendViaPy() {
    // 1. Prepare your JS payload
    const jsData = { a: [1,2,3], b: [4,5,6] }
    // 2. Expose it to Python
    pyodide.globals.set("payload", jsData)
    // 3. Run an async Python snippet
    const code = `
from js import fetch, JSON
import asyncio

async def call_connect():
    resp = await fetch(
        "https://connect.your.org/__api__/my‐data‐processor/process",
        {
            "method": "POST",
            "headers": {
                "Content-Type": "application/json",
                # "Authorization": "Key MY_CONNECT_KEY"
            },
            "body": JSON.stringify(payload)
        }
    )
    if not resp.ok:
        text = await resp.text()
        raise RuntimeError(f"{resp.status}: {text}")
    return await resp.json()

# run and assign back to a Python var
result = asyncio.get_event_loop().run_until_complete(call_connect())
`
    await pyodide.runPythonAsync(code)
    // 4. Grab the result back
    const pyResult = pyodide.globals.get("result").toJs()
    setOut(pyResult)
  }

  return (
    <div>
      <button onClick={sendViaPy}>Send via Pyodide</button>
      {out && <pre>{JSON.stringify(out,null,2)}</pre>}
    </div>
  )
}
