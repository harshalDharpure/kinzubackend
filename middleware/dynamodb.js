const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const REGION = process.env.AWS_REGION || 'us-east-1';
const USERS_TABLE = 'Users';
const VOICEDATA_TABLE = 'VoiceData';

const ddbClient = new DynamoDBClient({ region: REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

// User functions
async function createUser(user) {
  const user_uuid = uuidv4();
  const newUser = { ...user, user_uuid };
  await ddbDocClient.send(new PutCommand({ TableName: USERS_TABLE, Item: newUser }));
  return newUser;
}

async function getUserByEmail(email) {
  const params = {
    TableName: USERS_TABLE,
    IndexName: 'email-index', // You need to create a GSI on 'email'
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email },
  };
  const result = await ddbDocClient.send(new QueryCommand(params));
  return result.Items && result.Items[0];
}

async function getUserByUUID(user_uuid) {
  const params = {
    TableName: USERS_TABLE,
    Key: { user_uuid },
  };
  const result = await ddbDocClient.send(new GetCommand(params));
  return result.Item;
}

async function updateUser(user_uuid, updates) {
  // Simple update (for demo); for production, build UpdateExpression dynamically
  const params = {
    TableName: USERS_TABLE,
    Key: { user_uuid },
    UpdateExpression: 'set #name = :name, birthday = :birthday, address = :address',
    ExpressionAttributeNames: { '#name': 'name' },
    ExpressionAttributeValues: {
      ':name': updates.name,
      ':birthday': updates.birthday,
      ':address': updates.address,
    },
    ReturnValues: 'ALL_NEW',
  };
  const result = await ddbDocClient.send(new UpdateCommand(params));
  return result.Attributes;
}

// Voice data functions
async function createVoiceData(voiceData) {
  const voice_id = uuidv4();
  const newVoiceData = { ...voiceData, voice_id };
  await ddbDocClient.send(new PutCommand({ TableName: VOICEDATA_TABLE, Item: newVoiceData }));
  return newVoiceData;
}

async function getVoiceDataByUser(user_uuid) {
  const params = {
    TableName: VOICEDATA_TABLE,
    IndexName: 'user_uuid-timestamp-index', // You need a GSI for user_uuid+timestamp
    KeyConditionExpression: 'user_uuid = :user_uuid',
    ExpressionAttributeValues: { ':user_uuid': user_uuid },
    ScanIndexForward: false, // newest first
  };
  const result = await ddbDocClient.send(new QueryCommand(params));
  return result.Items;
}

module.exports = {
  createUser,
  getUserByEmail,
  getUserByUUID,
  updateUser,
  createVoiceData,
  getVoiceDataByUser,
}; 