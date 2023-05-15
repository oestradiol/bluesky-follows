import { BskyUser, BskyUserStruct, IBskyUser } from '../entities/bskyUser';

export default class BskyUserRepo {
  static readonly createBskyUser = async (struct: BskyUserStruct, logWarn = true): Promise<any> => {
    let bskyUser: any = null;
    try {
      bskyUser = await (new BskyUser(struct)).save();
      
      if (logWarn)
        console.log('BskyUser added to the database:', bskyUser);
    } catch (err: any) {
      if (err.constructor.name !== "MongoServerError" || err.code !== 11000) {
        console.error('Failed to add BskyUser to the database.');
        throw err;
      } else if (logWarn) {
        console.error(`Failed to add BskyUser to the database: User already exists.\nError message: ${err.message}`);
      }
    }
  
    return bskyUser;
  }
  
  // Retrieving an BskyUser from the database
  static readonly getBskyUser = async (did: string, logWarn: boolean = true) => {
    let foundBskyUser: IBskyUser | null = null;
    try {
      // Find a single BskyUser that matches the criteria
      foundBskyUser = await BskyUser.findOne({ did: did }).exec();
  
      if (logWarn){
        if (foundBskyUser) {
          console.log('BskyUser found:', foundBskyUser);
        } else {
          console.log('BskyUser not found:', foundBskyUser);
        }
      }
    } catch (error) {
      console.error('Failed to retrieve BskyUser from the database:', error);
    }
    return foundBskyUser;
  }
  
  // Deleting an BskyUser from the database
  static readonly deleteBskyUser = async (did: string, logWarn = true) => {
    try {
      // Delete a single BskyUser that matches the criteria
      const deletionResult = await BskyUser.deleteMany({ did: did }).exec();
  
      if (logWarn) {
        if (deletionResult.deletedCount && deletionResult.deletedCount > 0) {
          console.log('BskyUser deleted successfully');
        } else {
          console.log('BskyUser not found or not deleted');
        }
      }
    } catch (error) {
      console.error('Failed to delete BskyUser from the database:', error);
    }
  }
}