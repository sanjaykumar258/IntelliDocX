const jwt = require('jsonwebtoken');
const axios = require('axios');

async function testApiReq() {
    const token = jwt.sign({ 
        userId: 'c598a3bd-30f7-4d93-873f-b33c6968641c', 
        email: 'employee@acme.com', 
        role: 'EMPLOYEE', 
        organizationId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' 
    }, 'intellidocx-super-secret-jwt-key-2024-change-in-production', { expiresIn: '1h' }); 
    
    try { 
        await axios.delete('http://localhost:5000/api/documents/215aad0c-eb5a-493e-997f-6a825962a883', { 
            headers: { Authorization: 'Bearer ' + token } 
        }); 
        console.log('Successfully requested API delete'); 
    } catch(e) { 
        console.error('AXIOS ERR:', e.response?.data?.message || e.message); 
    }
}
testApiReq();
