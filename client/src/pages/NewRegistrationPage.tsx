import { useState } from 'react'

export default function NewRegistrationPage() {
  const [value, setValue] = useState('')
  
  return (
    <div>
      <input 
        type="text"
        value={value}
        onChange={e => {
          console.log('Change event:', e.target.value)
          setValue(e.target.value)
        }}
      />
      <p>Current value: {value}</p>
    </div>
  )
}