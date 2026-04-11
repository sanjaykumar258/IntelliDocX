
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
const EMAIL = 'manager@acme.com';
const PASSWORD = 'password123';

async function verifyFiltering() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD
        });
        const token = loginRes.data.accessToken;
        console.log('✅ Login successful.');

        // 2b. Filter by Category: INVOICE
        console.log('\n--- Filtering by Category: INVOICE ---');
        const invoiceRes = await axios.get(`${API_URL}/documents?category=INVOICE`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const invoices = invoiceRes.data.data;
        console.log(`Found ${invoices.length} invoices.`);
        if (invoices.length > 0) {
            const allMatch = invoices.every((d: any) => d.category === 'INVOICE');
            if (allMatch) console.log('✅ All results match category INVOICE');
            else console.error('❌ Mismatch in category results');
            invoices.forEach((d: any) => console.log(`   - ${d.title} (${d.category})`));
        } else {
            console.warn('⚠️ No invoices found to verify.');
        }

        // 2c. Filter by Category: FINANCIAL (Parent Group)
        console.log('\n--- Filtering by Group: FINANCIAL ---');
        const financialRes = await axios.get(`${API_URL}/documents?category=FINANCIAL`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const financialDocs = financialRes.data.data;
        console.log(`Found ${financialDocs.length} financial documents.`);
        if (financialDocs.length > 0) {
            console.log('✅ Found documents in Financial group:');
            financialDocs.forEach((d: any) => console.log(`   - ${d.title} (${d.category})`));
        } else {
            console.warn('⚠️ No financial documents found to verify.');
        }

    } catch (error: any) {
        console.error('❌ Filtering Failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

verifyFiltering();
