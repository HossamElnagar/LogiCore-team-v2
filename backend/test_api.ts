import dotenv from 'dotenv';

dotenv.config();

async function runTest() {
  try {
    console.log("Logging in...");
    // Let's use the owner credentials that we know exist, or the test driver
    // We can just login as corporate@logicore.com, the default owner
    const loginRes = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "corporate@logicore.com",
        password: "password123"
      })
    });
    const loginData = await loginRes.json();
    
    if (!loginData.data) {
       console.log("Login failed:", loginData);
       return;
    }
    const token = loginData.data.token;
    console.log("Login successful, token acquired.");
    
    const payload = {
      shipments: [
        {
          "trackingNumber": "TRK-003",
          "codAmount": 100,
          "pickupAddress": "Main Hub",
          "driverEmail": "driver1@company.com",
          "customerName": "Alice",
          "customerPhone": "01012345678",
          "deliveryAddress": "Address 1"
        },
        {
          "trackingNumber": "TRK-004",
          "codAmount": 200,
          "pickupAddress": "Main Hub",
          "driverEmail": "driver1@company.com",
          "customerName": "Bob",
          "customerPhone": "01012345678",
          "deliveryAddress": "Address 2"
        }
      ]
    };

    console.log("Sending bulk import request...");
    const importRes = await fetch(
      "http://localhost:5000/api/shipments/bulk-import",
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      }
    );
    
    const importData = await importRes.json();
    console.log("Status:", importRes.status);
    console.log("Response:", JSON.stringify(importData, null, 2));

  } catch (err) {
    console.log("Error:", err.message);
  }
}

runTest();
