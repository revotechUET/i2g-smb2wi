const axios = require('axios');
const authService = process.env.WI_AUTH_SERVICE

async function find_email_by_user(token, username) {
    const axiosConfig = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': token,
        }
    };
    const url = `${authService}/user/info-email?username=${username}`;
    const response = await axios.get(url, axiosConfig);
    return response.data.content;
}

module.exports = find_email_by_user