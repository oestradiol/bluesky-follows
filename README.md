# Bluesky Follows
This is a Node.js script for automating certain tasks on Bluesky Social, a social network built on the AT protocol.

## Currently, the script is able to:
- Log in to Bluesky Social;
- Back up a list of followers and a list of followed users to separate JSON files;
- Keep tracking of all following/followers.

## Requirements
- Node.js;
- A Bluesky Social account;
- An `.env` file containing your Bluesky Social account information (`IDENTIFIER` and `PASSWORD`) and the DB connection string.

## Installation
- Clone the repository;
- Install dependencies by running `npm i`;
- Edit the existing `.env.example` located at the root of the project by adding your info, and then rename it to `.env`.

## Usage
To run the script, simply run npm start from the command line. The script will log in to Bluesky Social, back up a list of followers and a list of followed users to separate JSON files in the output/ folder. Finally, it'll analyse all your following/followers and save the current state in the db.

Notes:
- This assumes you already have a MongoDB configured;
- The script uses a cache to avoid making too many API requests. By default, the cache is set to 3 minutes.

# License
This project is licensed under the GNU GPL-3.0 License.
