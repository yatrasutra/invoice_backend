import { Client, Databases, Storage, Users } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Appwrite client
const client = new Client();

client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

// Initialize services
export const databases = new Databases(client);
export const storage = new Storage(client);
export const users = new Users(client);

// Export configuration
export const config = {
  databaseId: process.env.APPWRITE_DATABASE_ID,
  submissionsCollectionId: process.env.APPWRITE_SUBMISSIONS_COLLECTION_ID,
  usersCollectionId: process.env.APPWRITE_USERS_COLLECTION_ID,
  bucketId: process.env.APPWRITE_BUCKET_ID,
};

export default client;



