import { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs';
import { BskyUser, FollowType } from './database/entities/bskyUser';
import { agent, cache } from '.';

import Config from './config';

export default class Manager {
  /**
   * Define function that reads the list of auto follows from the db and
   * unfollows any accounts that the user is following but who are not following the user back
   * or who were not manually followed by the user.
   */
  static readonly cleanFollowers = async (): Promise<void> => {
    console.log("Loading follows to unfollow...");
    const autoFollows = await BskyUser.find({ type: FollowType.AutoFollow }); // Get auto follows
    const currentFollows = await Manager.getAllFollows(Config.IDENTIFIER!); // Get the current list of follows
    const currentFollowers = await Manager.getAllFollowers(Config.IDENTIFIER!); // Get the current list of followers

    console.log("Starting unfollowing spree...")
    let counter: number = 0;
    for (const follow of currentFollows) {
      // Unfollows if the user doesn't follow you back, and you didn't originally follow it.
      const toUnfollow = !currentFollowers.some((currentFollower: ProfileView) => currentFollower.did === follow.did) &&
        !autoFollows.some(autoFollow => autoFollow.did === follow.did);

      if (toUnfollow) {
        counter += 1;
        await agent.deleteFollow(follow.viewer!.following!);
      }
    }

    console.log(`${counter} people have been unfollowed!`);
  };

  /**
   * Define helper function that gets all followers for the user's profile
   * @returns An array of ProfileView objects representing the user's followers
   * Warning!! The API is hiding some of the results (I assume banned/deactivated accounts?), which leads to repetitions in the returned array...
   */
  static readonly getAllFollowers = async (identifier: string): Promise<ProfileView[]> => {
    // Check if the result is already cached
    const cachedResult = cache.get(`followers:${identifier}`);
    if (cachedResult) {
      console.log('Returning cached result for getAllFollowers.');
      return cachedResult as ProfileView[];
    }

    const followers: ProfileView[] = [];

    const profile = await agent.getProfile({actor: identifier}); // Get the user's profile
    if (!profile) return followers; // If no profile is returned, return an empty array

    let cursor: string | undefined = undefined;
    while (true) {
      // Get the user's followers in batches of 100 and add them to the followers array
      const data: { cursor?: string; followers: ProfileView[] } = (
        await agent.getFollowers({actor: identifier, limit: 100, cursor: cursor})
      ).data;
      cursor = data.cursor;

      const newFollowers = data.followers.filter(nf => !followers.some(of => of.did == nf.did));
      if (newFollowers.length != 0) {
        followers.push(...newFollowers);
      } else {
        break;
      }
    }

    // Cache the result for 3 minutes
    cache.set(`followers:${identifier}`, followers);

    return followers;
  };

  /**
   * Define helper function that gets all accounts the user is following
   * @returns An array of ProfileView objects representing the accounts the user is following
   * Warning!! The API is hiding some of the results (I assume banned/deactivated accounts?), which leads to repetitions in the returned array...
   */
  static readonly getAllFollows = async (identifier: string): Promise<ProfileView[]> => {
    // Check if the result is already cached
    const cachedResult = cache.get(`follows:${identifier}`);
    if (cachedResult) {
      console.log('Returning cached result for getAllFollows.');
      return cachedResult as ProfileView[];
    }

    const follows: ProfileView[] = [];

    const profile = await agent.getProfile({actor: identifier}); // Get the user's profile
    if (!profile) return follows; // If no profile is returned, return an empty array

    let cursor: string | undefined = undefined;
    while (true) {
      // Get the accounts the user is following in batches of 100 and add them to the follows array
      const data: { cursor?: string, follows: ProfileView[] } = (
        await agent.getFollows({actor: identifier, limit: 100, cursor: cursor})
      ).data;
      cursor = data.cursor;
      
      const newFollows = data.follows.filter(nf => !follows.some(of => of.did == nf.did));
      if (newFollows.length != 0) {
        follows.push(...newFollows);
      } else {
        break;
      }
    }

    // Cache the result for 3 minutes
    cache.set(`follows:${identifier}`, follows);

    return follows;
  };
}