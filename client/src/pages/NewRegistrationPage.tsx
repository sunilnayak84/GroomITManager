import { useRef, useEffect } from 'react'

export default function NewRegistrationPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Log when component mounts
  useEffect(() => {
    console.log('Component mounted')
  }, [])

  const handleChange = () => {
    // Read value directly from DOM
    const currentValue = inputRef.current?.value
    console.log('Current input value:', currentValue)
    
    // Update display value
    if (document.getElementById('display-value')) {
      document.getElementById('display-value')!.textContent = currentValue || ''
    }
  }
  
  return (
    <div style={{ padding: '20px' }}>
      <h2>Test Input (Uncontrolled)</h2>
      <input 
        ref={inputRef}
        type="text"
        onChange={handleChange}
        style={{ 
          padding: '8px',
          margin: '10px 0',
          border: '1px solid #ccc'
        }}
      />
      <p id="display-value"></p>
    </div>
  )
}
