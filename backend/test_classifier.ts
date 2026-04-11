import { classifyDocument } from './src/services/documentClassifier.service';

async function testClassifier() {
    const receiptText = "PAYMENT RECEIPT Receipt No: REC-101 Date: 25-02-2026 Received From: Client Name Amount Received: $500 Payment Mode: Credit Card -- 1 of 1 --";
    const billText = "BILL INVOICE Bill Number: B-2024-88 Customer: John Doe Total Amount: 120.50 USD Due Date: 30-03-2026 -- 1 of 1 --";

    const receiptResult = await classifyDocument(receiptText, 'Payment_Receipt (1).pdf');
    console.log("=== RECEIPT ===");
    console.log(JSON.stringify(receiptResult, null, 2));

    const billResult = await classifyDocument(billText, 'Bill.pdf');
    console.log("\n=== BILL ===");
    console.log(JSON.stringify(billResult, null, 2));
}

testClassifier();
