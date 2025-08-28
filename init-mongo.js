// MongoDB initialization script for Docker
db = db.getSiblingDB('octomate_voting');

// Create collections
db.createCollection('users');
db.createCollection('votes');

// Create indexes for better performance
db.users.createIndex({ "username": 1 }, { unique: true });
db.votes.createIndex({ "user_id": 1 }, { unique: true });
db.votes.createIndex({ "name": 1 });

print('Database initialized successfully!');