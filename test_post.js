const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function test() {
  try {
    const formData = new FormData();
    formData.append('title', 'Test Paper Title is Long Enough');
    formData.append('abstract', 'This is an abstract that is definitely long enough to pass the min 20 chars.');
    formData.append('authors', 'Test Author | test@test.com | 12345 | Address | Designation');
    formData.append('subjectId', '6a003bebdf0cb750d5f09341'); // AI subject
    
    // Create a dummy PDF
    fs.writeFileSync('dummy.pdf', 'dummy content');
    formData.append('pdf', fs.createReadStream('dummy.pdf'));

    console.log('Sending request...');
    // We need an auth token though...
    // Let's just bypass auth for a moment in papers.ts or see if it gets a 401.
    // Actually, I can't easily get a valid token without a Google login!
  } catch (e) {
    console.error(e.response?.data || e.message);
  } 
}
test();
