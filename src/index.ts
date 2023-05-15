import { BskyAgent, AtpSessionEvent, AtpSessionData } from '@atproto/api';

import DbManager from './database/dbManager';
import NodeCache from 'node-cache';
import Config from './config';
import Backup from './backup';

// Create the cache instance with a TTL (time-to-live) equals to duration
export const cache = new NodeCache({ stdTTL: Config.CACHE_DURATION });

// Create new agent instance
let session: AtpSessionData | undefined;
export const agent = new BskyAgent({
  service: Config.SERVICE,
  persistSession: (evt: AtpSessionEvent, sess?: AtpSessionData) => {
    session = sess;
  },
});

/**
 * Define main function
 */
const main = async () => {
  await DbManager.connect();

  // Log in to service with the given identifier and password
  await login();

  // Back up initial followers and follows
  await Backup.dumpFollowers(Config.ORIGINAL_FOLLOWERS_FILENAME, true);
  await Backup.dumpFollows(Config.ORIGINAL_FOLLOWS_FILENAME, true);

  // Keep db consistency
  await DbManager.update();
};

/**
 * Define login function
 */
const login = async () => {
  if (!Config.IDENTIFIER || !Config.PASSWD) {
    console.log("Failed to get identifier and/or password. Please check if your .env file is set up correctly, then try again.");
    return;
  }

  await agent.login({identifier: Config.IDENTIFIER, password: Config.PASSWD});
}

// Invokes main to start program
main();