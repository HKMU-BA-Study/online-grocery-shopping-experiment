exports.handler = async (event, context) => {

    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: "Method Not Allowed" })
        };
    }

    try {
        const body = JSON.parse(event.body);
        const inputPassword = body.password;

        const CORRECT_PASSWORD = process.env.ADMIN_PASSWORD;

        if (!CORRECT_PASSWORD) {
            return {
                statusCode: 500,
                body: JSON.stringify({ success: false, message: "Server configuration error: ADMIN_PASSWORD not set." })
            };
        }

        if (inputPassword === CORRECT_PASSWORD) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, message: "Login successful!" })
            };
        } else {
            return {
                statusCode: 401,
                body: JSON.stringify({ success: false, message: "Wrong Password!" })
            };
        }
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ success: false, message: "Invalid request body." })
        };
    }
};