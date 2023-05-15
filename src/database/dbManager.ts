import { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs';
import { BskyUser, FollowType } from './entities/bskyUser';
import { agent } from '..';

import BskyUserRepo from './repositories/bskyUserRepo';
import mongoose from 'mongoose';
import Manager from '../manager';
import Config from '../config';

export default class DbManager {
  static readonly connect = async () => {
    // Connect to the MongoDB server
    await mongoose.connect(Config.MONGO_CONNECT_STR!).then(() => {
      console.log('Connected to the MongoDB server');
    });
  }

  static readonly update = async () => {
    // Update followers
    await DbManager.updateFollowers();

    // Update follows
    await DbManager.updateFollows();

    // TODO: Add last followed dates (3d ago)
    // TODO: Be careful with people that might be deactivated or block u
    // TODO: Add update info, such as handle

    console.log("Finished updating database consistency!");
  }

  private static readonly updateFollowers = async () => {
    console.log("Updating followers consistency...");
    const followers = await Manager.getAllFollowers(Config.IDENTIFIER!);
    for (const u of await BskyUser.find({ followsMe: true })) {
      if (!followers.find(f => f.did == u.did)) {
        console.log(`${u.handle} unfollowed you :c`);
        await u.updateOne({ followsMe: false }).exec();
      }
    }
    for (const f of followers) {
      const u = await BskyUserRepo.getBskyUser(f.did, false);
      if (!!u) {
        if (!u.followsMe) {
          console.log(`${f.handle} now follows you! <3`);
          await u.updateOne({ followsMe: true }).exec();
        }
      } else {
        console.log(`${f.handle} now follows you! <3`);
        const struct = {
          did: f.did,
          handle: f.handle,
          type: FollowType.Unknown,
          numOfAttempts: 0,
          followsMe: true,
        };
        await BskyUserRepo.createBskyUser(struct, false);
      }
    }
  }

  private static readonly updateFollows = async () => {
    console.log("Updating follows consistency...");
    const follows = await Manager.getAllFollows(Config.IDENTIFIER!);
    for (const u of await BskyUser.find({ type: FollowType.Manual })) {
      if (!follows.find(f => f.did == u.did)) {
        console.log(`You unfollowed ${u.handle}. Goodbye!!`);
        await u.updateOne({ type: FollowType.Unknown, isBlacklisted: true }).exec();
      }
    }
    for (const f of follows) {
      const u = await BskyUserRepo.getBskyUser(f.did, false);
      if (!!u) {
        if (u.type == FollowType.Unknown) {
          const numOfAttempts = u.numOfAttempts + 1;
          console.log(`You now follow ${f.handle}. Attempt ${numOfAttempts}.`);
          await u.updateOne({ type: FollowType.Manual, numOfAttempts: numOfAttempts, lastFollowedAt: new Date() }).exec();
        }
      } else {
        console.log(`You now follow ${f.handle}. Attempt 1.`);
        const struct = {
          did: f.did,
          handle: f.handle,
          type: FollowType.Manual,
          numOfAttempts: 1,
          followsMe: false, // Is false because followers were added previously
          lastFollowedAt: new Date(),
        };
        await BskyUserRepo.createBskyUser(struct, false);
      }
    }
  }

  /**
   * Define function to cache all suggested users
   */
  // TODO: Maybe make a Cron job to run this once a week?
  static readonly cacheAll = async () => {
    console.log("Caching new suggestions...");
    
    // Define function to fetch 100 suggestions and fetch initial
    let suggestions: ProfileView[];
    let cursor: string | undefined = undefined;
    const fetchSuggestions = async () => {
      const data: { cursor?: string, actors: ProfileView[] } = (
        await agent.getSuggestions({limit: 100, cursor: cursor})
      ).data;
      suggestions = data.actors;
      if (!!data.cursor)
        cursor = data.cursor;
    };
    await fetchSuggestions();

    // Loop while there are still suggestions
    let counter = 0;
    while (suggestions!.length > 0) {
      counter += suggestions!.length;
      
      // Add each suggestion
      for (const suggestion of suggestions!) {
        const struct = {
          did: suggestion.did,
          handle: suggestion.handle,
          type: FollowType.Unknown,
          numOfAttempts: 0,
          followsMe: !!suggestion.viewer?.followedBy,
        };
        await BskyUserRepo.createBskyUser(struct, false);
      }

      // Fetch new suggestions
      await fetchSuggestions();
    }

    console.log(`Finished caching all suggestions (${counter}).`);
  };
}
