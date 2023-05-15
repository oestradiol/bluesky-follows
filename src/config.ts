import dotenv from 'dotenv';

// Load and retrieve environment variables from .env file
dotenv.config();
export default class Config {
  // Define service URL (default is Bluesky Social)
  static readonly SERVICE = 'https://bsky.social';

  // Define MongoDB connect string
  static readonly MONGO_CONNECT_STR = process.env.DBCONNECTSTR;

  // Get default login variables
  static readonly IDENTIFIER = process.env.IDENTIFIER;
  static readonly PASSWD = process.env.PASSWORD;
  
  // Define output folder and file paths for backup files
  static readonly OUTPUT_FOLDER = "output/";
  static readonly ORIGINAL_FOLLOWERS_FILENAME = `originalFollowers.txt`;
  static readonly ORIGINAL_FOLLOWS_FILENAME = `originalFollows.txt`;
  
  // Define cache duration for time-consuming methods (default is 3 minutes)
  static readonly CACHE_DURATION = 180;
}