import { BskyAgent, AtpSessionEvent, AtpSessionData } from '@atproto/api'
import { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs';
import NodeCache from 'node-cache';
import dotenv from 'dotenv'
import fs from 'fs'

// Define service URL (default is Bluesky Social)
const service = 'https://bsky.social';

// Load and retrieve environment variables from .env file
dotenv.config();
const identifier = process.env.IDENTIFIER;
const passwd = process.env.PASSWORD;

// Define output folder and file paths for backup files
const OUTPUT_FOLDER = "output/";
const ORIGINAL_FOLLOWERS_FILENAME = `originalFollowers.txt`;
const ORIGINAL_FOLLOWS_FILENAME = `originalFollows.txt`;

// Define cache duration for time-consuming methods (default is 3 minutes)
// Then, creates the cache instance with a TTL (time-to-live) equals to duration
const CACHE_DURATION = 180;
const cache = new NodeCache({ stdTTL: CACHE_DURATION });

// Create new agent instance
// let session: AtpSessionData | undefined;
const agent = new BskyAgent({
  service: service,
  // persistSession: (evt: AtpSessionEvent, sess?: AtpSessionData) => {
  //   session = sess;
  // },
});

/**
 * Define main function
 */
const main = async () => {
  // Log in to service with the given identifier and password
  await login();

  // Back up initial followers and follows
  await dumpFollowers(ORIGINAL_FOLLOWERS_FILENAME, true);
  await dumpFollows(ORIGINAL_FOLLOWS_FILENAME, true);

  // Follow all suggested users
  await followAll();

  // Unfollow everyone that didn't follow you back and you hadn't originally followed
  // await cleanFollowers();
};

/**
 * Define login function
 */
const login = async () => {
  if (!identifier || !passwd) {
    console.log("Failed to get identifier and/or password. Please check if your .env file is set up correctly, then try again.");
    return;
  }

  await agent.login({identifier: identifier, password: passwd});
}

/**
 * Define function to follow all suggested users
 */
const followAll = async () => {
  let suggestions: ProfileView[];
  let counter = 0;

  // Define function to fetch 100 suggestions
  const fetchSuggestions = async () => { suggestions = (await agent.getSuggestions()).data.actors };
  
  // Fetch initial suggestions
  await fetchSuggestions();

  // Loop while there are still suggestions
  while (suggestions!.length > 0) {
    counter += suggestions!.length;
    
    // Follow each suggestion
    for (const suggestion of suggestions!)
      await agent.follow(suggestion.did);

    // Fetch new suggestions
    await fetchSuggestions();
  }

  console.log(`Finished following all suggestions (${counter}).`);
};


/**
 * Define function to dump follows to a file
 */
const dumpFollows = async (filePath: string, checkFileExists: boolean = false) => {
  await checkAndWrite(filePath, checkFileExists, getAllFollows);
};


/**
 * Define function to dump followers to a file
 */
const dumpFollowers = async (filePath: string, checkFileExists: boolean = false) => {
  await checkAndWrite(filePath, checkFileExists, getAllFollowers);
};

/**
 * Define function to check if a file exists and write to it
 */
const checkAndWrite = async (filePath: string, checkFileExists: boolean, contentGetter: () => any) => {
  filePath = `${OUTPUT_FOLDER}${filePath}`; 

  // If file exists and checkFileExists is true, skip writing to the file
  if (checkFileExists && await fileExists(filePath)) {
    console.log(`File already exists: ${filePath}. Skipping...`);
    return;
  }

  // Get content using the provided contentGetter function and write to the file
  const content = await contentGetter();
  await fs.promises.writeFile(filePath, JSON.stringify(content, null, 2), { flag: "w" });
};

/**
 * Define function to check if a file exists
 * @returns true if file exists, false if not.
 */
const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Define function that reads the original list of follows from a JSON file and
 * unfollows any accounts that the user is following but who are not following the user back
 * or who were not originally followed by the user.
 */
const cleanFollowers = async (): Promise<void> => {
  const originalFollows = (await tryGetFromFile<ProfileView[]>( `${OUTPUT_FOLDER}${ORIGINAL_FOLLOWS_FILENAME}`)) ?? []; // Read the original list of follows from the JSON file
  const currentFollows = await getAllFollows(); // Get the current list of follows
  const currentFollowers = await getAllFollowers(); // Get the current list of followers

  for (const follow of currentFollows) {
    // Unfollows if the user doesn't follow you back, and you didn't originally follow it.
    const toUnfollow = !currentFollowers.some((currentFollower: ProfileView) => currentFollower.did === follow.did) &&
      !originalFollows.some((originalFollow: ProfileView) => originalFollow.did === follow.did);

    if (toUnfollow)
      await agent.deleteFollow(follow.viewer?.following!);
  }
};

/**
 * Define helper function that tries to get an object from a file
 * @returns The object when succeeds, null if fails
 */
const tryGetFromFile = async <T>(filePath: string): Promise<T> => {
  try {
    return JSON.parse((await fs.promises.readFile(filePath)).toString()) as T;
  } catch {
    return null as unknown as T;
  }
}

/**
 * Define helper function that gets all followers for the user's profile
 * @returns An array of ProfileView objects representing the user's followers
 */
const getAllFollowers = async (): Promise<ProfileView[]> => {
  // Check if the result is already cached
  const cachedResult = cache.get('followers');
  if (cachedResult) {
    console.log('Returning cached result for getAllFollowers.');
    return cachedResult as ProfileView[];
  }

  const followers: ProfileView[] = [];

  const profile = await agent.getProfile({actor: identifier!}); // Get the user's profile
  if (!profile) return followers; // If no profile is returned, return an empty array

  let cursor: string | undefined = undefined;
  while (followers.length < profile.data.followersCount!) {
    // Get the user's followers in batches of 100 and add them to the followers array
    const data: { cursor?: string; followers: ProfileView[] } = (
      await agent.getFollowers({actor: identifier!, limit: 100, cursor: cursor})
    ).data;
    cursor = data.cursor;
    followers.push(...data.followers);
  }

  // Cache the result for 3 minutes
  cache.set('followers', followers);

  return followers;
};

/**
 * Define helper function that gets all accounts the user is following
 * @returns An array of ProfileView objects representing the accounts the user is following
 */
const getAllFollows = async (): Promise<ProfileView[]> => {
  // Check if the result is already cached
  const cachedResult = cache.get('follows');
  if (cachedResult) {
    console.log('Returning cached result for getAllFollows.');
    return cachedResult as ProfileView[];
  }

  const follows: ProfileView[] = [];

  const profile = await agent.getProfile({actor: identifier!}); // Get the user's profile
  if (!profile) return follows; // If no profile is returned, return an empty array

  let cursor: string | undefined = undefined;
  while (follows.length < profile.data.followsCount!) {
    // Get the accounts the user is following in batches of 100 and add them to the follows array
    const data: { cursor?: string, follows: ProfileView[] } = (
      await agent.getFollows({actor: identifier!, limit: 100, cursor: cursor})
    ).data;
    cursor = data.cursor;
    follows.push(...data.follows);
  }

  // Cache the result for 3 minutes
  cache.set('follows', follows);

  return follows;
};

// Invokes main to start program
main();