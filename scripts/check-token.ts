import axios from "axios";

async function checkTokenValidity(token: string): Promise<boolean> {
	const url = `https://graph.facebook.com/${process.env.GRAPH_API_VERSION}/me?access_token=${token}`;
	return axios
		.get(url)
		.then(() => true)
		.catch((error) => {
			console.error(
				"Error checking token validity:",
				error.response?.data || error.message,
			);
			return false;
		});
}

const token = process.env.FACEBOOK_ACCESS_TOKEN || "";
checkTokenValidity(token).then((isValid) => {
	if (isValid) {
		console.log("The access token is valid.");
	} else {
		console.log("The access token is invalid.");
	}
});
