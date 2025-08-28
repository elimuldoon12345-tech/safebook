exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
  
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  try {
    const qs = event.queryStringParameters || {};
    const appointmentTypeId = qs.appointmentTypeId || qs.appointmentTypeID;
    const debug = qs.debug === '1';

    if (!appointmentTypeId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing appointmentTypeId" }),
      };
    }

    // Use correct environment variable names
    const userId = process.env.ACUITY_USER;
    const apiKey = process.env.ACUITY_KEY;
    
    if (!userId || !apiKey) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([{
          time: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
          debug: "Missing ACUITY_USER or ACUITY_KEY environment variables"
        }])
      };
    }

    // Get current and next month
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 7);

    const auth = Buffer.from(`${userId}:${apiKey}`).toString("base64");
    let allResults = [];
    let debugInfo = [];

    // Try current month
    try {
      const url1 = `https://acuityscheduling.com/api/v1/availability/times?appointmentTypeID=${appointmentTypeId}&month=${currentMonth}`;
      const resp1 = await fetch(url1, {
        headers: { Authorization: `Basic ${auth}` }
      });
      
      if (resp1.ok) {
        const data1 = await resp1.json();
        if (Array.isArray(data1)) {
          allResults.push(...data1);
        }
        debugInfo.push(`Current month: ${data1.length} results`);
      } else {
        debugInfo.push(`Current month: HTTP ${resp1.status}`);
      }
    } catch (e) {
      debugInfo.push(`Current month error: ${e.message}`);
    }

    // Try next month
    try {
      const url2 = `https://acuityscheduling.com/api/v1/availability/times?appointmentTypeID=${appointmentTypeId}&month=${nextMonth}`;
      const resp2 = await fetch(url2, {
        headers: { Authorization: `Basic ${auth}` }
      });
      
      if (resp2.ok) {
        const data2 = await resp2.json();
        if (Array.isArray(data2)) {
          allResults.push(...data2);
        }
        debugInfo.push(`Next month: ${data2.length} results`);
      } else {
        debugInfo.push(`Next month: HTTP ${resp2.status}`);
      }
    } catch (e) {
      debugInfo.push(`Next month error: ${e.message}`);
    }

    // Debug mode response
    if (debug) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          appointmentTypeId,
          userId: userId ? "SET" : "MISSING",
          apiKey: apiKey ? "SET" : "MISSING",
          debugInfo,
          totalResults: allResults.length,
          sampleResults: allResults.slice(0, 3)
        })
      };
    }

    // Return results
    if (allResults.length > 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(allResults.slice(0, 12))
      };
    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([])
      };
    }

  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};