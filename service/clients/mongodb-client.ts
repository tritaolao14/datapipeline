import { MongoClient } from 'mongodb';


import { Agent } from 'https';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ quiet: false });
//environment variables

//mongodb
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;
const MONGODB_COLLECTION_NAME = process.env.MONGODB_COLLECTION_NAME;

//init clients
export const mongoClient = new MongoClient(MONGODB_URI || '');