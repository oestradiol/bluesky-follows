# Bluesky Follows
This is a Node.js script for automating certain tasks on Bluesky Social, a social network built on the AT protocol.

## Currently, the script is able to:
- Log in to Bluesky Social;
- Back up a list of followers and a list of followed users to separate JSON files;
- Follow all suggested users;
- Unfollow users that aren't following you back and that you hadn't originally followed.

## Requirements
- Node.js;
- A Bluesky Social account;
- An `.env` file containing your Bluesky Social account information (`IDENTIFIER` and `PASSWORD`).

## Installation
- Clone the repository;
- Install dependencies by running `npm i`;
- Edit the existing `.env.example` located at the root of the project by adding your Bluesky Social account information, and then rename it to `.env`.

## Usage
To run the script, simply run npm start from the command line. The script will log in to Bluesky Social, back up a list of followers and a list of followed users to separate JSON files in the output/ folder.

If later on you'd like to unfollow users that aren't following you back and that you hadn't originally followed, comment the `await followAll()` then uncomment the `await cleanFollowers()`, both located at the end of the `main()` function.

Note: the script uses a cache to avoid making too many API requests. By default, the cache is set to 3 minutes.

# License
This project is licensed under the GNU GPL-3.0 License.
