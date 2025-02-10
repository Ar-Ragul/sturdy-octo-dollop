const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Hello, Node.js is working!');
});

const PORT = 8000;
app.listen(PORT, () => console.log(`✅ Test server running on port ${PORT}`));
