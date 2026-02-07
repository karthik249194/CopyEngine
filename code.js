const response = await fetch('https://copy-engine-chi.vercel.app/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: 'your user input here',
      tone: 'neutral' // or empathetic, encouraging, direct, Professional
    })
  });
  
  const data = await response.json();
  console.log(data.options); // Your 5 copy variations