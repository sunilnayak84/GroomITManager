import React, { useState } from 'react';

const NewRegistrationPage: React.FC = () => {
  console.log('Rendering NewRegistrationPage');
  const [inputText, setInputText] = useState('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    console.log('Input changed:', newValue);
    setInputText(newValue);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Basic Input Test</h1>
      <input
        type="text"
        value={inputText}
        onChange={handleInputChange}
        style={{ 
          display: 'block',
          width: '100%',
          maxWidth: '300px',
          padding: '8px',
          margin: '20px 0',
          border: '1px solid #ccc'
        }}
      />
      <div>Typed value: {inputText}</div>
    </div>
  );
};

export default NewRegistrationPage;
