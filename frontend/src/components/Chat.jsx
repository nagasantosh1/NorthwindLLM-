import React, { useState, useRef } from 'react'
import axios from 'axios'
import ChartRenderer from './ChartRenderer'

export default function Chat(){
  const [messages, setMessages] = useState([
    { role:'assistant', content: 'Hi! Ask me something like "Total sales by category in 1997".' }
  ])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const inputRef = useRef()

  async function send(){
    const text = inputRef.current.value.trim()
    if(!text) return
    setMessages(m => [...m, {role:'user', content: text}])
    setLoading(true)
    setResult(null)
    try{
      const { data } = await axios.post('/api/chat', { message: text })
      // data: { sql, rows, columns, viz, summary }
      setResult(data)
      const summary = data.summary || 'Here are the results.'
      setMessages(m => [...m, {role:'assistant', content: summary + (data.sql ? `\n\nSQL: ${data.sql}`: '')}])
      inputRef.current.value = ''
    }catch(err){
      const msg = err?.response?.data?.detail
        || err?.message
        || 'Something went wrong.'
      setMessages(m => [...m, {role:'assistant', content: msg}])
    }finally{
      setLoading(false)
    }
  }

  function onKey(e){
    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault()
      send()
    }
  }

  const copySQL = async () => {
    if(!result?.sql) return
    await navigator.clipboard.writeText(result.sql)
    alert('SQL copied!')
  }

  return (
    <div style={{display:'grid', gridTemplateColumns:'minmax(300px, 420px) 1fr', gap:16}}>
      {/* Left: chat panel */}
      <div style={{display:'flex', flexDirection:'column', gap:12}}>
        <div style={{border:'1px solid #e5e7eb', borderRadius:12, padding:12, minHeight:240, background:'#fff'}}>
          {messages.map((m, idx) => (
            <div key={idx} style={{marginBottom:10}}>
              <div style={{fontSize:12, color:'#6b7280', marginBottom:2}}>{m.role}</div>
              <div style={{
                background: m.role === 'user' ? '#eef2ff' : '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '8px 10px',
                whiteSpace: 'pre-wrap'
              }}>
                {m.content}
              </div>
            </div>
          ))}
        </div>

        <div style={{display:'flex', gap:8}}>
          <textarea
            ref={inputRef}
            rows={2}
            placeholder="Ask a question about Northwind data…"
            onKeyDown={onKey}
            style={{
              flex:1, resize:'vertical',
              border:'1px solid #d1d5db', borderRadius:10, padding:10
            }}
          />
          <button disabled={loading} onClick={send}
            style={{
              padding:'8px 14px', borderRadius:10,
              background:'#111827', color:'#fff',
              border:'1px solid #111827', cursor:'pointer'
            }}>
            {loading ? 'Thinking…' : 'Send'}
          </button>
        </div>

        {result?.sql && (
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <code style={{
              display:'inline-block', padding:'6px 8px', borderRadius:8,
              background:'#f3f4f6', border:'1px solid #e5e7eb', overflowX:'auto'
            }}>
              {result.sql}
            </code>
            <button onClick={copySQL} style={{...btnSecondary}}>Copy SQL</button>
          </div>
        )}
      </div>

      {/* Right: viz + table */}
      <div>
        {result ? (
          <ChartRenderer
            data={toObjects(result.columns, result.rows)}
            columns={result.columns}
            initialViz={result.viz}
          />
        ) : (
          <div style={{
            border:'1px dashed #d1d5db', borderRadius:12, padding:20,
            color:'#6b7280', background:'#fff'
          }}>
            Ask a question to see charts and data here.
          </div>
        )}
      </div>
    </div>
  )
}

const btnSecondary = {
  padding:'6px 10px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#fff',
  cursor: 'pointer'
}

function toObjects(columns = [], rows = []) {
  return rows.map(r => {
    const obj = {}
    columns.forEach((c, idx) => { obj[c] = r[idx] })
    return obj
  })
}
