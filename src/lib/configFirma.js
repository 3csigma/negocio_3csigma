const fetch = require('node-fetch');

fetch('https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature&client_id=1cd5f927-9c3a-4238-9c00-9388edf3f264&state=a3pcsgmngco&redirect_uri=http://localhost:3000/auth/docusign/callback', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
        'Content-Type': 'application/json',
        'auth-token': ''
    }
}).then(res => res.json())
.catch(error => console.error('Error:', error))
.then(async response => {
    console.log("Success:", response);
});