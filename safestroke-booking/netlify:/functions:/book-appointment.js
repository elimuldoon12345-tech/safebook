// netlify/functions/book-appointment.js
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method Not Allowed" };
  }

  try {
    const userId = process.env.ACUITY_USER_ID;
    const apiKey = process.env.ACUITY_API_KEY;
    if (!userId || !apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Server is missing Acuity credentials" }),
      };
    }

    const booking = JSON.parse(event.body || "{}");
    // Expecting: appointmentTypeID, datetime (ISO), firstName, lastName, email, phone, notes?
    const required = ["appointmentTypeID", "datetime", "firstName", "lastName", "email"];
    const missing = required.filter((k) => !booking[k]);
    if (missing.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Missing fields: ${missing.join(", ")}` }),
      };
    }

    const auth = Buffer.from(`${userId}:${apiKey}`).toString("base64");
    const payload = {
      appointmentTypeID: booking.appointmentTypeID,
      datetime: booking.datetime,
      firstName: booking.firstName,
      lastName: booking.lastName,
      email: booking.email,
      phone: booking.phone || "",
      notes: booking.notes || "",
      // If you use coupons or certificates in Acuity, you can add them here as well.
      // certificate: booking.certificate,
      // coupon: booking.coupon,
    };

    const resp = await fetch("https://acuityscheduling.com/api/v1/appointments", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("Acuity booking error:", resp.status, text);
      return {
        statusCode: resp.status,
        headers,
        body: JSON.stringify({ error: "Booking failed", message: text || String(resp.status) }),
      };
    }

    const data = await resp.json(); // returns appointment object
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, appointmentId: data?.id, data }),
    };
  } catch (e) {
    console.error("book-appointment failed:", e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal error", message: e.message }),
    };
  }
};
