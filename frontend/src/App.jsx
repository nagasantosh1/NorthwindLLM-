import React from 'react'
import Chat from './components/Chat'

export default function App(){
  return (
    <div style={{padding: 16, maxWidth: 1200, margin: '0 auto'}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <h1 style={{margin:0, fontSize:20}}>Northwind Sales Insights</h1>
        <a href="https://github.com/" target="_blank" rel="noreferrer" style={{fontSize:12, color:'#6b7280'}}>GitHub</a>
      </header>
      <Chat />
    </div>
  )
}
